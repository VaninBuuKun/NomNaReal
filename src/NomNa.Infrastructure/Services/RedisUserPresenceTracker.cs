using Microsoft.Extensions.Logging;
using NomNa.Application.Common.Interfaces;
using StackExchange.Redis;

namespace NomNa.Infrastructure.Services;

/// <summary>
/// Real-time user presence tracker backed by Redis.
/// Employs a distributed connection lease model with heartbeat renewal (ZSET Unix timestamps).
/// Operates under strict Single Source of Truth: if Redis is disconnected, fails fast rather than
/// polluting local in-memory dictionaries that cause split-brain presence discrepancies.
/// </summary>
public class RedisUserPresenceTracker : IUserPresenceTracker
{
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<RedisUserPresenceTracker> _logger;

    private const string OnlineUsersZSetKey = "nomna:presence:online_users";
    private const string UserConnectionsKeyPrefix = "nomna:presence:user:";
    private const string ConnectionKeyPrefix = "nomna:presence:conn:";

    // Connection lease duration (60 seconds). SignalR client pings every 25 seconds.
    private static readonly TimeSpan ConnectionLeaseTtl = TimeSpan.FromSeconds(60);

    #region Precompiled Lua Scripts (Atomic 1-RTT execution)

    // Connect script: sets connection key, adds to user set, checks prior score, and updates ZSET score
    private static readonly LuaScript ConnectScript = LuaScript.Prepare(@"
        redis.call('SET', @connKey, @userId, 'EX', @ttl)
        redis.call('SADD', @userKey, @connId)
        redis.call('EXPIRE', @userKey, @ttl)
        local prevScore = redis.call('ZSCORE', @zsetKey, @userId)
        local isFirst = 1
        if prevScore and tonumber(prevScore) > tonumber(@now) then
            isFirst = 0
        end
        redis.call('ZADD', @zsetKey, @expiresAt, @userId)
        return isFirst
    ");

    // Disconnect script: deletes connection key, removes from user set, and clears ZSET if no connections remain
    private static readonly LuaScript DisconnectScript = LuaScript.Prepare(@"
        redis.call('DEL', @connKey)
        redis.call('SREM', @userKey, @connId)
        local remaining = redis.call('SCARD', @userKey)
        if remaining == 0 then
            redis.call('DEL', @userKey)
            redis.call('ZREM', @zsetKey, @userId)
            return 1
        end
        return 0
    ");

    // Heartbeat script: refreshes TTL for connection and user keys, and extends ZSET lease score
    private static readonly LuaScript HeartbeatScript = LuaScript.Prepare(@"
        redis.call('EXPIRE', @connKey, @ttl)
        redis.call('EXPIRE', @userKey, @ttl)
        redis.call('ZADD', @zsetKey, @expiresAt, @userId)
        return 1
    ");

    #endregion

    public RedisUserPresenceTracker(IConnectionMultiplexer redis, ILogger<RedisUserPresenceTracker> logger)
    {
        _redis = redis;
        _logger = logger;
    }

    public async Task<bool> UserConnectedAsync(Guid userId, string connectionId)
    {
        if (!_redis.IsConnected)
        {
            _logger.LogError("Distributed Presence Error: Redis is disconnected on UserConnectedAsync for {UserId}", userId);
            return false;
        }

        try
        {
            var db = _redis.GetDatabase();
            var userKey = $"{UserConnectionsKeyPrefix}{userId}";
            var connKey = $"{ConnectionKeyPrefix}{connectionId}";
            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var expiresAt = now + (long)ConnectionLeaseTtl.TotalSeconds;

            // Execute connect pipeline in a single atomic Lua script (1 round-trip)
            var result = await db.ScriptEvaluateAsync(ConnectScript, new
            {
                connKey = (RedisKey)connKey,
                userKey = (RedisKey)userKey,
                zsetKey = (RedisKey)OnlineUsersZSetKey,
                userId = (RedisValue)userId.ToString(),
                connId = (RedisValue)connectionId,
                ttl = (RedisValue)(long)ConnectionLeaseTtl.TotalSeconds,
                now = (RedisValue)now,
                expiresAt = (RedisValue)expiresAt
            });

            return (int)result == 1;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to register connection {ConnectionId} in Redis for {UserId}", connectionId, userId);
            return false;
        }
    }

    public async Task<bool> UserDisconnectedAsync(Guid userId, string connectionId)
    {
        if (!_redis.IsConnected)
        {
            _logger.LogError("Distributed Presence Error: Redis is disconnected on UserDisconnectedAsync for {UserId}", userId);
            return false;
        }

        try
        {
            var db = _redis.GetDatabase();
            var userKey = $"{UserConnectionsKeyPrefix}{userId}";
            var connKey = $"{ConnectionKeyPrefix}{connectionId}";

            // Execute disconnect pipeline in a single atomic Lua script (1 round-trip)
            var result = await db.ScriptEvaluateAsync(DisconnectScript, new
            {
                connKey = (RedisKey)connKey,
                userKey = (RedisKey)userKey,
                zsetKey = (RedisKey)OnlineUsersZSetKey,
                userId = (RedisValue)userId.ToString(),
                connId = (RedisValue)connectionId
            });

            return (int)result == 1;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to remove connection {ConnectionId} in Redis for {UserId}", connectionId, userId);
            return false;
        }
    }

    public async Task HeartbeatAsync(Guid userId, string connectionId)
    {
        if (!_redis.IsConnected)
        {
            _logger.LogWarning("Redis is disconnected during HeartbeatAsync for {UserId}", userId);
            return;
        }

        try
        {
            var db = _redis.GetDatabase();
            var userKey = $"{UserConnectionsKeyPrefix}{userId}";
            var connKey = $"{ConnectionKeyPrefix}{connectionId}";
            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var expiresAt = now + (long)ConnectionLeaseTtl.TotalSeconds;

            // Execute heartbeat in a single atomic Lua script (1 round-trip)
            await db.ScriptEvaluateAsync(HeartbeatScript, new
            {
                connKey = (RedisKey)connKey,
                userKey = (RedisKey)userKey,
                zsetKey = (RedisKey)OnlineUsersZSetKey,
                userId = (RedisValue)userId.ToString(),
                ttl = (RedisValue)(long)ConnectionLeaseTtl.TotalSeconds,
                expiresAt = (RedisValue)expiresAt
            });

            // Probabilistic self-healing cleanup (~2% probability)
            // Purges expired leases without spawning redundant background workers across multi-node clusters
            if (Random.Shared.Next(0, 50) == 0)
            {
                _ = db.SortedSetRemoveRangeByScoreAsync(OnlineUsersZSetKey, double.NegativeInfinity, now);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis error during HeartbeatAsync for {UserId}", userId);
        }
    }

    public async Task<bool> IsUserOnlineAsync(Guid userId)
    {
        if (!_redis.IsConnected)
        {
            return false;
        }

        try
        {
            var db = _redis.GetDatabase();
            var score = await db.SortedSetScoreAsync(OnlineUsersZSetKey, userId.ToString());
            if (score.HasValue)
            {
                var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                return score.Value > now;
            }
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis error during IsUserOnlineAsync for {UserId}", userId);
            return false;
        }
    }

    /// <summary>
    /// Evaluates online presence for a collection of user IDs in a single pipelined Redis batch.
    /// Eliminates N+1 Redis queries when loading friend lists and server members.
    /// </summary>
    public async Task<IReadOnlyDictionary<Guid, bool>> AreUsersOnlineAsync(IReadOnlyCollection<Guid> userIds)
    {
        if (userIds.Count == 0)
            return new Dictionary<Guid, bool>();

        if (!_redis.IsConnected)
        {
            return userIds.ToDictionary(id => id, _ => false);
        }

        try
        {
            var db = _redis.GetDatabase();
            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

            // Pipelined batch query
            var batch = db.CreateBatch();
            var scoreTasks = userIds
                .Distinct()
                .ToDictionary(id => id, id => batch.SortedSetScoreAsync(OnlineUsersZSetKey, id.ToString()));

            batch.Execute();
            await Task.WhenAll(scoreTasks.Values);

            return scoreTasks.ToDictionary(
                kv => kv.Key,
                kv => kv.Value.Result.HasValue && kv.Value.Result.Value > now
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis error during AreUsersOnlineAsync");
            return userIds.ToDictionary(id => id, _ => false);
        }
    }

    public async Task<IReadOnlyCollection<Guid>> GetOnlineUsersAsync()
    {
        if (!_redis.IsConnected)
        {
            return Array.Empty<Guid>();
        }

        try
        {
            var db = _redis.GetDatabase();
            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

            // Retrieve active online members whose lease has not expired (score > now)
            var members = await db.SortedSetRangeByScoreAsync(OnlineUsersZSetKey, now, double.PositiveInfinity);
            var result = new List<Guid>(members.Length);

            foreach (var m in members)
            {
                if (Guid.TryParse(m.ToString(), out var id))
                {
                    result.Add(id);
                }
            }

            return result.AsReadOnly();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis error during GetOnlineUsersAsync");
            return Array.Empty<Guid>();
        }
    }

    public async Task<IReadOnlyCollection<string>> GetConnectionsForUserAsync(Guid userId)
    {
        if (!_redis.IsConnected)
        {
            return Array.Empty<string>();
        }

        try
        {
            var db = _redis.GetDatabase();
            var userKey = $"{UserConnectionsKeyPrefix}{userId}";
            var members = await db.SetMembersAsync(userKey);
            if (members.Length == 0) return Array.Empty<string>();

            // Pipeline existence checks for all connections to eliminate N+1 round-trips
            var batch = db.CreateBatch();
            var checkTasks = new List<(string ConnId, Task<bool> ExistsTask)>(members.Length);

            foreach (var m in members)
            {
                var connId = m.ToString();
                var connKey = $"{ConnectionKeyPrefix}{connId}";
                checkTasks.Add((connId, batch.KeyExistsAsync(connKey)));
            }

            batch.Execute();
            await Task.WhenAll(checkTasks.Select(t => t.ExistsTask));

            var validConnections = new List<string>(members.Length);
            foreach (var (connId, existsTask) in checkTasks)
            {
                if (existsTask.Result)
                {
                    validConnections.Add(connId);
                }
                else
                {
                    // Clean up orphaned connection asynchronously
                    _ = db.SetRemoveAsync(userKey, connId);
                }
            }

            return validConnections.AsReadOnly();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis error during GetConnectionsForUserAsync for {UserId}", userId);
            return Array.Empty<string>();
        }
    }
}
