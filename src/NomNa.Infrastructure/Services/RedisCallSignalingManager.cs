using Microsoft.Extensions.Logging;
using NomNa.Application.Common.Interfaces;
using StackExchange.Redis;

namespace NomNa.Infrastructure.Services;

/// <summary>
/// Distributed 1v1 WebRTC call signaling manager backed by Redis.
/// Eliminates split-brain call state where callers and callees connect to different WebAPI cluster nodes.
/// Follows Strict Consistency & Fail-Fast principles without un-reconcilable in-memory fallbacks.
/// </summary>
public class RedisCallSignalingManager : ICallSignalingManager
{
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<RedisCallSignalingManager> _logger;

    private const string CallUserKeyPrefix = "nomna:call:user:";

    // Atomic Lua script: Checks both users' busy status before reserving the call slot
    private static readonly LuaScript InitiateCallScript = LuaScript.Prepare(@"
        local callerKey = @callerKey
        local targetKey = @targetKey
        local callerId = @callerId
        local targetId = @targetId
        local ttl = tonumber(@ttl)

        if redis.call('EXISTS', callerKey) == 1 or redis.call('EXISTS', targetKey) == 1 then
            return 0 -- Either caller or target is busy
        end

        redis.call('SET', callerKey, targetId, 'EX', ttl)
        redis.call('SET', targetKey, callerId, 'EX', ttl)
        return 1
    ");

    public RedisCallSignalingManager(IConnectionMultiplexer redis, ILogger<RedisCallSignalingManager> logger)
    {
        _redis = redis;
        _logger = logger;
    }

    private IDatabase GetRequiredDatabase()
    {
        if (!_redis.IsConnected)
        {
            _logger.LogError("Distributed Call Signaling Error: Redis is disconnected. Failing fast.");
            throw new InvalidOperationException("Distributed call signaling service is currently unavailable. Please retry in a moment.");
        }
        return _redis.GetDatabase();
    }

    public async Task<bool> TryInitiateCallAsync(
        Guid callerId,
        Guid targetUserId,
        TimeSpan ringTimeout,
        CancellationToken cancellationToken = default)
    {
        var db = GetRequiredDatabase();
        var callerKey = $"{CallUserKeyPrefix}{callerId}";
        var targetKey = $"{CallUserKeyPrefix}{targetUserId}";
        var ttlSeconds = (long)ringTimeout.TotalSeconds;

        var result = await db.ScriptEvaluateAsync(InitiateCallScript, new
        {
            callerKey = (RedisKey)callerKey,
            targetKey = (RedisKey)targetKey,
            callerId = (RedisValue)callerId.ToString(),
            targetId = (RedisValue)targetUserId.ToString(),
            ttl = (RedisValue)ttlSeconds
        });

        return (int)result == 1;
    }

    public async Task<bool> HasActiveCallAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var db = GetRequiredDatabase();
        return await db.KeyExistsAsync($"{CallUserKeyPrefix}{userId}");
    }

    public async Task<Guid?> GetCallPartnerAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var db = GetRequiredDatabase();
        var val = await db.StringGetAsync($"{CallUserKeyPrefix}{userId}");
        if (val.HasValue && Guid.TryParse(val.ToString(), out var partnerId))
        {
            return partnerId;
        }
        return null;
    }

    public async Task<bool> VerifyPendingCallAsync(
        Guid callerId,
        Guid targetUserId,
        CancellationToken cancellationToken = default)
    {
        var db = GetRequiredDatabase();
        var val = await db.StringGetAsync($"{CallUserKeyPrefix}{callerId}");
        if (val.HasValue && Guid.TryParse(val.ToString(), out var pendingTarget))
        {
            return pendingTarget == targetUserId;
        }
        return false;
    }

    public async Task EndCallAsync(
        Guid userA,
        Guid userB,
        CancellationToken cancellationToken = default)
    {
        var db = GetRequiredDatabase();
        var batch = db.CreateBatch();
        _ = batch.KeyDeleteAsync($"{CallUserKeyPrefix}{userA}");
        _ = batch.KeyDeleteAsync($"{CallUserKeyPrefix}{userB}");
        batch.Execute();
    }

    public async Task<Guid?> CleanupCallForUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var db = GetRequiredDatabase();
        var userKey = $"{CallUserKeyPrefix}{userId}";
        var partnerVal = await db.StringGetAsync(userKey);

        if (partnerVal.HasValue && Guid.TryParse(partnerVal.ToString(), out var partnerId))
        {
            var batch = db.CreateBatch();
            _ = batch.KeyDeleteAsync(userKey);
            _ = batch.KeyDeleteAsync($"{CallUserKeyPrefix}{partnerId}");
            batch.Execute();

            return partnerId;
        }

        await db.KeyDeleteAsync(userKey);
        return null;
    }
}

