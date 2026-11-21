using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using StackExchange.Redis;

namespace NomNa.Infrastructure.Services;

/// <summary>
/// Redis Pub/Sub backed distributed cache invalidation bus.
/// Ensures immediate sub-millisecond invalidation of L1 in-memory caches across all cluster nodes
/// whenever permissions, user profiles, or pinned messages are modified.
/// </summary>
public class RedisCacheInvalidationBus : ICacheInvalidationBus, IHostedService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<RedisCacheInvalidationBus> _logger;

    private static readonly RedisChannel InvalidationChannel = RedisChannel.Literal("nomna:cache:invalidation");

    public RedisCacheInvalidationBus(
        IConnectionMultiplexer redis,
        IServiceScopeFactory scopeFactory,
        ILogger<RedisCacheInvalidationBus> logger)
    {
        _redis = redis;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task PublishInvalidationAsync(CacheInvalidationMessage message, CancellationToken cancellationToken = default)
    {
        try
        {
            if (_redis.IsConnected)
            {
                var json = JsonSerializer.Serialize(message);
                var subscriber = _redis.GetSubscriber();
                await subscriber.PublishAsync(InvalidationChannel, json);
                _logger.LogDebug("Published distributed cache invalidation for {Scope}: {EntityId}", message.Scope, message.EntityId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to publish cache invalidation message for {Scope}: {EntityId}", message.Scope, message.EntityId);
        }
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            if (_redis.IsConnected)
            {
                var subscriber = _redis.GetSubscriber();
                await subscriber.SubscribeAsync(InvalidationChannel, OnInvalidationReceived);
                _logger.LogInformation("Subscribed to Redis distributed cache invalidation channel: {Channel}", InvalidationChannel);
            }
            else
            {
                _logger.LogWarning("Redis is not connected at startup. Distributed cache invalidation subscription deferred.");
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to initialize Redis cache invalidation subscription.");
        }
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        try
        {
            if (_redis.IsConnected)
            {
                var subscriber = _redis.GetSubscriber();
                await subscriber.UnsubscribeAsync(InvalidationChannel);
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Error unsubscribing from Redis cache invalidation channel.");
        }
    }

    private void OnInvalidationReceived(RedisChannel channel, RedisValue value)
    {
        if (!value.HasValue) return;

        try
        {
            var message = JsonSerializer.Deserialize<CacheInvalidationMessage>((string)value!);
            if (message == null) return;

            using var scope = _scopeFactory.CreateScope();

            switch (message.Scope)
            {
                case CacheInvalidationScope.ServerPermissions:
                    var permService = scope.ServiceProvider.GetService<IPermissionService>();
                    permService?.InvalidateLocalServer(message.EntityId);
                    break;

                case CacheInvalidationScope.ChannelPermissions:
                    var chPermService = scope.ServiceProvider.GetService<IPermissionService>();
                    chPermService?.InvalidateLocalChannel(message.EntityId);
                    break;

                case CacheInvalidationScope.UserPermissions:
                    if (message.SecondaryId.HasValue)
                    {
                        var uPermService = scope.ServiceProvider.GetService<IPermissionService>();
                        uPermService?.InvalidateLocalUser(message.EntityId, message.SecondaryId.Value);
                    }
                    break;

                case CacheInvalidationScope.UserProfile:
                    var profileCache = scope.ServiceProvider.GetService<IUserProfileCache>();
                    profileCache?.InvalidateLocal(message.EntityId);
                    break;

                case CacheInvalidationScope.PinnedMessages:
                    var pinnedCache = scope.ServiceProvider.GetService<IPinnedMessageCache>();
                    pinnedCache?.InvalidateLocal(message.EntityId);
                    break;
            }

            _logger.LogDebug("Processed remote cache invalidation for {Scope}: {EntityId}", message.Scope, message.EntityId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to process cache invalidation message from Redis.");
        }
    }
}

