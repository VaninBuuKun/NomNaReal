using Microsoft.Extensions.Logging;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using StackExchange.Redis;

namespace NomNa.Infrastructure.Services;

/// <summary>
/// Distributed 1v1 WebRTC call signaling manager backed by Redis Hashes.
/// Stores structured bilateral call state (partnerId, role, status, isVideo, startedAt, connectedAt).
/// Eliminates split-brain call state across WebAPI cluster nodes and provides exact call duration calculation.
/// Follows Strict Consistency & Fail-Fast principles without un-reconcilable in-memory fallbacks.
/// </summary>
public class RedisCallSignalingManager : ICallSignalingManager
{
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<RedisCallSignalingManager> _logger;

    private const string CallUserKeyPrefix = "nomna:call:user:";

    // Atomic Lua script: Verifies neither caller nor callee is currently busy, then creates bilateral ringing leases
    private static readonly LuaScript InitiateCallScript = LuaScript.Prepare(@"
        local callerKey = @callerKey
        local targetKey = @targetKey
        local callerId = @callerId
        local targetId = @targetId
        local isVideo = @isVideo
        local now = @now
        local ttl = tonumber(@ttl)

        if redis.call('EXISTS', callerKey) == 1 or redis.call('EXISTS', targetKey) == 1 then
            return 0 -- Either caller or target is already busy in a call
        end

        redis.call('HSET', callerKey,
            'partnerId', targetId, 'role', 'caller', 'status', 'ringing',
            'isVideo', isVideo, 'startedAt', now, 'connectedAt', '0')
        redis.call('EXPIRE', callerKey, ttl)

        redis.call('HSET', targetKey,
            'partnerId', callerId, 'role', 'callee', 'status', 'ringing',
            'isVideo', isVideo, 'startedAt', now, 'connectedAt', '0')
        redis.call('EXPIRE', targetKey, ttl)
        return 1
    ");

    // Atomic Lua script: Transitions call state from ringing to connected and extends lease TTL
    private static readonly LuaScript AcceptCallScript = LuaScript.Prepare(@"
        local callerKey = @callerKey
        local responderKey = @responderKey
        local callerId = @callerId
        local responderId = @responderId
        local now = @now

        local callerPartner = redis.call('HGET', callerKey, 'partnerId')
        local callerStatus = redis.call('HGET', callerKey, 'status')
        if not callerPartner or callerPartner ~= responderId or callerStatus ~= 'ringing' then
            return 0
        end

        redis.call('HSET', callerKey, 'status', 'connected', 'connectedAt', now)
        redis.call('EXPIRE', callerKey, 7200) -- Max 2 hours lease for active connected call
        redis.call('HSET', responderKey, 'status', 'connected', 'connectedAt', now)
        redis.call('EXPIRE', responderKey, 7200)
        return 1
    ");

    // Atomic Lua script: Cleans up both user call keys and returns metadata to record call history
    private static readonly LuaScript TerminateCallScript = LuaScript.Prepare(@"
        local userKey = @userKey
        local expectedPartner = @expectedPartner
        local prefix = @prefix

        local partnerId = redis.call('HGET', userKey, 'partnerId')
        if not partnerId then
            return { 0 }
        end

        if expectedPartner ~= '' and partnerId ~= expectedPartner then
            return { 0 }
        end

        local role = redis.call('HGET', userKey, 'role') or 'caller'
        local status = redis.call('HGET', userKey, 'status') or 'ringing'
        local isVideo = redis.call('HGET', userKey, 'isVideo') or '0'
        local connectedAt = tonumber(redis.call('HGET', userKey, 'connectedAt') or '0')
        local partnerKey = prefix .. partnerId

        redis.call('DEL', userKey)
        redis.call('DEL', partnerKey)
        return { 1, partnerId, role, status, isVideo, tostring(connectedAt) }
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
        bool isVideo,
        TimeSpan ringTimeout,
        CancellationToken cancellationToken = default)
    {
        var db = GetRequiredDatabase();
        var callerKey = $"{CallUserKeyPrefix}{callerId}";
        var targetKey = $"{CallUserKeyPrefix}{targetUserId}";
        var ttlSeconds = (long)ringTimeout.TotalSeconds;
        var nowUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

        var result = await db.ScriptEvaluateAsync(InitiateCallScript, new
        {
            callerKey = (RedisKey)callerKey,
            targetKey = (RedisKey)targetKey,
            callerId = (RedisValue)callerId.ToString(),
            targetId = (RedisValue)targetUserId.ToString(),
            isVideo = (RedisValue)(isVideo ? "1" : "0"),
            now = (RedisValue)nowUnix.ToString(),
            ttl = (RedisValue)ttlSeconds
        });

        return (int)result == 1;
    }

    public async Task<bool> TryAcceptCallAsync(
        Guid callerId,
        Guid responderId,
        CancellationToken cancellationToken = default)
    {
        var db = GetRequiredDatabase();
        var callerKey = $"{CallUserKeyPrefix}{callerId}";
        var responderKey = $"{CallUserKeyPrefix}{responderId}";
        var nowUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

        var result = await db.ScriptEvaluateAsync(AcceptCallScript, new
        {
            callerKey = (RedisKey)callerKey,
            responderKey = (RedisKey)responderKey,
            callerId = (RedisValue)callerId.ToString(),
            responderId = (RedisValue)responderId.ToString(),
            now = (RedisValue)nowUnix.ToString()
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
        var val = await db.HashGetAsync($"{CallUserKeyPrefix}{userId}", "partnerId");
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
        var callerKey = $"{CallUserKeyPrefix}{callerId}";
        var partnerVal = await db.HashGetAsync(callerKey, "partnerId");
        var statusVal = await db.HashGetAsync(callerKey, "status");

        if (partnerVal.HasValue && Guid.TryParse(partnerVal.ToString(), out var pendingTarget))
        {
            return pendingTarget == targetUserId && statusVal.ToString() == "ringing";
        }
        return false;
    }

    public async Task<CallTerminationResult> TerminateCallAsync(
        Guid userId,
        Guid? expectedPartnerId = null,
        CancellationToken cancellationToken = default)
    {
        var db = GetRequiredDatabase();
        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var userKey = $"{CallUserKeyPrefix}{userId}";

        var raw = (RedisResult[]?)await db.ScriptEvaluateAsync(TerminateCallScript, new
        {
            userKey = (RedisKey)userKey,
            expectedPartner = (RedisValue)(expectedPartnerId?.ToString() ?? string.Empty),
            prefix = (RedisValue)CallUserKeyPrefix
        });

        if (raw == null || raw.Length < 6 || (int)raw[0] == 0)
        {
            return new CallTerminationResult(false, Guid.Empty, Guid.Empty, false, false, 0);
        }

        var partnerId = Guid.Parse(raw[1].ToString()!);
        var role = raw[2].ToString();
        var status = raw[3].ToString();
        var isVideo = raw[4].ToString() == "1";
        var connectedAt = long.Parse(raw[5].ToString()!);

        var callerId = role == "caller" ? userId : partnerId;
        var calleeId = role == "caller" ? partnerId : userId;
        var wasConnected = status == "connected" && connectedAt > 0;
        var duration = wasConnected ? Math.Max(1, now - connectedAt) : 0;

        return new CallTerminationResult(true, callerId, calleeId, wasConnected, isVideo, duration);
    }

    public async Task EndCallAsync(
        Guid userA,
        Guid userB,
        CancellationToken cancellationToken = default)
    {
        await TerminateCallAsync(userA, userB, cancellationToken);
    }

    public async Task<CallTerminationResult> CleanupCallForUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        return await TerminateCallAsync(userId, null, cancellationToken);
    }
}
