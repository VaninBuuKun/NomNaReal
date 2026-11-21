using System.Text.Json;
using Microsoft.Extensions.Logging;
using NomNa.Application.Common.Interfaces;
using NomNa.Shared.Models;
using StackExchange.Redis;

namespace NomNa.Infrastructure.Services;

/// <summary>
/// Distributed Voice Room Manager backed by Redis.
/// Enforces Strict Consistency & Fail-Fast principles across multi-node WebAPI clusters.
/// Rejects in-memory fallbacks to prevent Split-Brain state divergence, ghost participants,
/// and unreconciled dual-write conflicts across server instances.
/// </summary>
public class RedisVoiceRoomManager : IVoiceRoomManager
{
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<RedisVoiceRoomManager> _logger;

    private const string ChannelKeyPrefix = "nomna:voice:channel:";
    private const string UserChannelKeyPrefix = "nomna:voice:user:";
    private const string ChannelServerKeyPrefix = "nomna:voice:channel_server:";
    private const string ServerChannelsKeyPrefix = "nomna:voice:server_channels:";

    public RedisVoiceRoomManager(IConnectionMultiplexer redis, ILogger<RedisVoiceRoomManager> logger)
    {
        _redis = redis;
        _logger = logger;
    }

    private IDatabase GetRequiredDatabase()
    {
        if (!_redis.IsConnected)
        {
            _logger.LogError("Distributed Voice State Error: Redis cluster connection is down. Failing fast to prevent Split-Brain.");
            throw new InvalidOperationException("Distributed voice service is currently unavailable. Please retry in a moment.");
        }
        return _redis.GetDatabase();
    }

    public async Task<IReadOnlyCollection<VoiceParticipantPayload>> GetParticipantsAsync(
        Guid channelId,
        CancellationToken cancellationToken = default)
    {
        var db = GetRequiredDatabase();
        var hashEntries = await db.HashGetAllAsync($"{ChannelKeyPrefix}{channelId}");

        if (hashEntries.Length == 0)
        {
            return Array.Empty<VoiceParticipantPayload>();
        }

        var list = new List<VoiceParticipantPayload>(hashEntries.Length);
        foreach (var entry in hashEntries)
        {
            if (entry.Value.HasValue)
            {
                var participant = JsonSerializer.Deserialize<VoiceParticipantPayload>((string)entry.Value!);
                if (participant != null)
                {
                    list.Add(participant);
                }
            }
        }
        return list;
    }

    public async Task<IReadOnlyCollection<VoiceParticipantPayload>> GetServerParticipantsAsync(
        Guid serverId,
        IEnumerable<Guid>? knownChannelIds = null,
        CancellationToken cancellationToken = default)
    {
        var db = GetRequiredDatabase();
        var channelIdStrings = new List<string>();

        // Query Redis Set for recorded server voice channels
        var setMembers = await db.SetMembersAsync($"{ServerChannelsKeyPrefix}{serverId}");
        foreach (var member in setMembers)
        {
            if (member.HasValue)
            {
                channelIdStrings.Add(member.ToString());
            }
        }

        // Merge with any known channel IDs provided by caller
        if (knownChannelIds != null)
        {
            foreach (var id in knownChannelIds)
            {
                var str = id.ToString();
                if (!channelIdStrings.Contains(str))
                {
                    channelIdStrings.Add(str);
                    _ = db.SetAddAsync($"{ServerChannelsKeyPrefix}{serverId}", str);
                }
            }
        }

        if (channelIdStrings.Count == 0)
        {
            return Array.Empty<VoiceParticipantPayload>();
        }

        // Pipelined batch read across all channel hashes (1 network RTT)
        var batch = db.CreateBatch();
        var tasks = new List<Task<HashEntry[]>>();
        foreach (var chIdStr in channelIdStrings)
        {
            tasks.Add(batch.HashGetAllAsync($"{ChannelKeyPrefix}{chIdStr}"));
        }
        batch.Execute();

        var results = await Task.WhenAll(tasks);
        var participants = new List<VoiceParticipantPayload>();
        foreach (var hashEntries in results)
        {
            foreach (var entry in hashEntries)
            {
                if (entry.Value.HasValue)
                {
                    var p = JsonSerializer.Deserialize<VoiceParticipantPayload>((string)entry.Value!);
                    if (p != null)
                    {
                        participants.Add(p);
                    }
                }
            }
        }

        return participants;
    }

    public async Task<Guid?> GetUserVoiceChannelAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var db = GetRequiredDatabase();
        var val = await db.StringGetAsync($"{UserChannelKeyPrefix}{userId}");
        if (val.HasValue && Guid.TryParse(val.ToString(), out var chId))
        {
            return chId;
        }
        return null;
    }

    public async Task SetUserVoiceAsync(
        Guid channelId,
        Guid serverId,
        VoiceParticipantPayload participant,
        CancellationToken cancellationToken = default)
    {
        var db = GetRequiredDatabase();
        var json = JsonSerializer.Serialize(participant);

        var batch = db.CreateBatch();
        _ = batch.HashSetAsync($"{ChannelKeyPrefix}{channelId}", participant.UserId.ToString(), json);
        _ = batch.StringSetAsync($"{UserChannelKeyPrefix}{participant.UserId}", channelId.ToString(), TimeSpan.FromHours(12));
        _ = batch.StringSetAsync($"{ChannelServerKeyPrefix}{channelId}", serverId.ToString(), TimeSpan.FromDays(7));
        _ = batch.SetAddAsync($"{ServerChannelsKeyPrefix}{serverId}", channelId.ToString());
        batch.Execute();
    }

    public async Task<(Guid? ChannelId, Guid? ServerId, IReadOnlyCollection<Guid> RemainingUserIds)> RemoveUserVoiceAsync(
        Guid userId,
        Guid? expectedChannelId = null,
        CancellationToken cancellationToken = default)
    {
        var db = GetRequiredDatabase();
        var channelId = expectedChannelId ?? await GetUserVoiceChannelAsync(userId, cancellationToken);
        if (!channelId.HasValue)
        {
            return (null, null, Array.Empty<Guid>());
        }

        var chId = channelId.Value;
        Guid? serverId = null;
        var remainingUserIds = new List<Guid>();

        var sIdVal = await db.StringGetAsync($"{ChannelServerKeyPrefix}{chId}");
        if (sIdVal.HasValue && Guid.TryParse(sIdVal.ToString(), out var parsedServerId))
        {
            serverId = parsedServerId;
        }

        var batch = db.CreateBatch();
        _ = batch.HashDeleteAsync($"{ChannelKeyPrefix}{chId}", userId.ToString());
        _ = batch.KeyDeleteAsync($"{UserChannelKeyPrefix}{userId}");
        var remainingTask = batch.HashGetAllAsync($"{ChannelKeyPrefix}{chId}");
        batch.Execute();

        var remainingEntries = await remainingTask;
        foreach (var entry in remainingEntries)
        {
            if (entry.Name.HasValue && Guid.TryParse(entry.Name.ToString(), out var rId) && rId != userId)
            {
                remainingUserIds.Add(rId);
            }
        }

        return (chId, serverId, remainingUserIds);
    }

    public async Task<VoiceParticipantPayload?> UpdateVoiceStateAsync(
        Guid channelId,
        Guid userId,
        bool isMuted,
        bool isDeafened,
        bool isSpeaking,
        bool isScreenSharing,
        bool isCameraActive,
        CancellationToken cancellationToken = default)
    {
        var db = GetRequiredDatabase();
        var existingVal = await db.HashGetAsync($"{ChannelKeyPrefix}{channelId}", userId.ToString());
        if (!existingVal.HasValue)
        {
            return null;
        }

        var existing = JsonSerializer.Deserialize<VoiceParticipantPayload>((string)existingVal!);
        if (existing == null)
        {
            return null;
        }

        var updated = existing with
        {
            IsMuted = isMuted,
            IsDeafened = isDeafened,
            IsSpeaking = isSpeaking,
            IsScreenSharing = isScreenSharing,
            IsCameraActive = isCameraActive
        };

        var json = JsonSerializer.Serialize(updated);
        await db.HashSetAsync($"{ChannelKeyPrefix}{channelId}", userId.ToString(), json);
        return updated;
    }

    public async Task<bool> AreUsersInSameVoiceChannelAsync(
        Guid channelId,
        Guid user1Id,
        Guid user2Id,
        CancellationToken cancellationToken = default)
    {
        var db = GetRequiredDatabase();
        var batch = db.CreateBatch();
        var t1 = batch.HashExistsAsync($"{ChannelKeyPrefix}{channelId}", user1Id.ToString());
        var t2 = batch.HashExistsAsync($"{ChannelKeyPrefix}{channelId}", user2Id.ToString());
        batch.Execute();

        return (await t1) && (await t2);
    }

    public async Task<Guid?> GetChannelServerIdAsync(Guid channelId, CancellationToken cancellationToken = default)
    {
        var db = GetRequiredDatabase();
        var val = await db.StringGetAsync($"{ChannelServerKeyPrefix}{channelId}");
        if (val.HasValue && Guid.TryParse(val.ToString(), out var sId))
        {
            return sId;
        }
        return null;
    }

    public async Task SetChannelServerIdAsync(Guid channelId, Guid serverId, CancellationToken cancellationToken = default)
    {
        var db = GetRequiredDatabase();
        var batch = db.CreateBatch();
        _ = batch.StringSetAsync($"{ChannelServerKeyPrefix}{channelId}", serverId.ToString(), TimeSpan.FromDays(7));
        _ = batch.SetAddAsync($"{ServerChannelsKeyPrefix}{serverId}", channelId.ToString());
        batch.Execute();
    }
}
