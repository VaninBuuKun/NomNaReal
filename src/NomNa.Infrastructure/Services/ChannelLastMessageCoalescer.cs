using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Npgsql;
using NpgsqlTypes;
using NomNa.Application.Common.Interfaces;

namespace NomNa.Infrastructure.Services;

/// <summary>
/// Background service that coalesces rapid channel last-message metadata updates
/// in memory and flushes them to PostgreSQL every 500ms.
/// </summary>
public sealed class ChannelLastMessageCoalescer : BackgroundService, IChannelLastMessageCoalescer
{
    private readonly record struct ChannelLastMessageState(
        DateTime LastMessageAt,
        string? LastMessageContent,
        Guid LastMessageSenderId);

    private readonly ConcurrentDictionary<Guid, ChannelLastMessageState> _pending = new();
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ChannelLastMessageCoalescer> _logger;
    private static readonly TimeSpan FlushInterval = TimeSpan.FromMilliseconds(500);

    public ChannelLastMessageCoalescer(
        IServiceScopeFactory scopeFactory,
        ILogger<ChannelLastMessageCoalescer> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public void Enqueue(Guid channelId, DateTime lastMessageAt, string? lastMessageContent, Guid lastMessageSenderId)
    {
        var incoming = new ChannelLastMessageState(lastMessageAt, lastMessageContent, lastMessageSenderId);
        _pending.AddOrUpdate(
            channelId,
            incoming,
            (_, existing) => incoming.LastMessageAt >= existing.LastMessageAt ? incoming : existing);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(FlushInterval);
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                if (!await timer.WaitForNextTickAsync(stoppingToken))
                    break;

                await FlushPendingAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error flushing channel last-message metadata.");
            }
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        await base.StopAsync(cancellationToken);
        try
        {
            await FlushPendingAsync(CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during final flush of channel last-message metadata on shutdown.");
        }
    }

    /// <summary>
    /// Drains all currently pending channel updates and persists them in a single scope.
    /// Exposed as internal for deterministic unit testing.
    /// </summary>
    internal async Task FlushPendingAsync(CancellationToken cancellationToken)
    {
        if (_pending.IsEmpty) return;

        var batch = new List<KeyValuePair<Guid, ChannelLastMessageState>>();
        foreach (var key in _pending.Keys)
        {
            if (_pending.TryRemove(key, out var state))
            {
                batch.Add(new KeyValuePair<Guid, ChannelLastMessageState>(key, state));
            }
        }

        if (batch.Count == 0) return;

        using var scope = _scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

        var channelIds = new Guid[batch.Count];
        var lastMessageAts = new DateTime[batch.Count];
        var lastMessageContents = new string?[batch.Count];
        var lastMessageSenderIds = new Guid[batch.Count];

        for (var i = 0; i < batch.Count; i++)
        {
            channelIds[i] = batch[i].Key;
            lastMessageAts[i] = batch[i].Value.LastMessageAt;
            lastMessageContents[i] = batch[i].Value.LastMessageContent;
            lastMessageSenderIds[i] = batch[i].Value.LastMessageSenderId;
        }

        const string sql = """
            UPDATE "Channels" AS c
            SET "LastMessageAt" = v.last_msg_at,
                "LastMessageContent" = v.last_msg_content,
                "LastMessageSenderId" = v.last_msg_sender_id
            FROM UNNEST(@channel_ids, @last_msg_ats, @last_msg_contents, @last_msg_sender_ids)
                AS v(ch_id, last_msg_at, last_msg_content, last_msg_sender_id)
            WHERE c."Id" = v.ch_id
              AND (c."LastMessageAt" IS NULL OR c."LastMessageAt" < v.last_msg_at);
            """;

        var parameters = new object[]
        {
            new NpgsqlParameter("channel_ids", NpgsqlDbType.Array | NpgsqlDbType.Uuid) { Value = channelIds },
            new NpgsqlParameter("last_msg_ats", NpgsqlDbType.Array | NpgsqlDbType.TimestampTz) { Value = lastMessageAts },
            new NpgsqlParameter("last_msg_contents", NpgsqlDbType.Array | NpgsqlDbType.Text) { Value = lastMessageContents },
            new NpgsqlParameter("last_msg_sender_ids", NpgsqlDbType.Array | NpgsqlDbType.Uuid) { Value = lastMessageSenderIds }
        };

        await ((DbContext)dbContext).Database.ExecuteSqlRawAsync(sql, parameters, cancellationToken);
    }
}
