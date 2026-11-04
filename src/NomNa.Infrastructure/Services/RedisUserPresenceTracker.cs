using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;
using NomNa.Application.Common.Interfaces;
using StackExchange.Redis;

namespace NomNa.Infrastructure.Services;

/// <summary>
/// Real-time user presence tracker backed by Redis.
/// Employs a connection lease model with heartbeat renewal (ZSET Unix timestamps).
/// Reduces round-trips via precompiled Lua scripts, pipelined batch queries,
/// and probabilistic self-healing cleanup without requiring active background workers.
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

    // Fallback in-memory presence dictionary in case Redis becomes unreachable
    private static readonly ConcurrentDictionary<Guid, HashSet<string>> _fallbackOnlineUsers = new();

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
        if (_redis.IsConnected)
        {
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
                    expiresAt = (RedisValue)expiresAt,
                    now = (RedisValue)now
                });

                return (int)result == 1;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis error during UserConnectedAsync for {UserId}, falling back to in-memory", userId);
            }
        }

        // Fallback in-memory
        var isFirst = false;
        _fallbackOnlineUsers.AddOrUpdate(
            userId,
            _ =>
            {
                isFirst = true;
                return new HashSet<string> { connectionId };
            },
            (_, connections) =>
            {
                lock (connections)
                {
                    if (connections.Count == 0) isFirst = true;
                    connections.Add(connectionId);
                }
                return connections;
            });

        return isFirst;
    }

    public async Task<bool> UserDisconnectedAsync(Guid userId, string connectionId)
    {
        if (_redis.IsConnected)
        {
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
                _logger.LogWarning(ex, "Redis error during UserDisconnectedAsync for {UserId}, falling back to in-memory", userId);
            }
        }

        // Fallback in-memory
        var isLast = false;
        if (_fallbackOnlineUsers.TryGetValue(userId, out var connections))
        {
            lock (connections)
            {
                connections.Remove(connectionId);
                if (connections.Count == 0)
                {
                    isLast = true;
                }
            }

            if (isLast)
            {
                _fallbackOnlineUsers.TryRemove(userId, out _);
            }
        }

        return isLast;
    }

    public async Task HeartbeatAsync(Guid userId, string connectionId)
    {
        if (_redis.IsConnected)
        {
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

                // Phase 3: Probabilistic self-healing cleanup (~2% probability)
                // Purges expired leases without spawning redundant background workers across multi-node clusters
                if (Random.Shared.Next(0, 50) == 0)
                {
                    _ = db.SortedSetRemoveRangeByScoreAsync(OnlineUsersZSetKey, double.NegativeInfinity, now);
                }

                return;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis error during HeartbeatAsync for {UserId}", userId);
            }
        }

        // Fallback in-memory heartbeat
        if (_fallbackOnlineUsers.TryGetValue(userId, out var conns))
        {
            lock (conns)
            {
                conns.Add(connectionId);
            }
        }
    }

    public async Task<bool> IsUserOnlineAsync(Guid userId)
    {
        if (_redis.IsConnected)
        {
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
            }
        }

        return _fallbackOnlineUsers.TryGetValue(userId, out var conns) && conns.Count > 0;
    }

    /// <summary>
    /// Evaluates online presence for a collection of user IDs in a single pipelined Redis batch.
    /// Eliminates N+1 Redis queries when loading friend lists and server members.
    /// </summary>
    public async Task<IReadOnlyDictionary<Guid, bool>> AreUsersOnlineAsync(IReadOnlyCollection<Guid> userIds)
    {
        if (userIds.Count == 0)
        {
            return new Dictionary<Guid, bool>();
        }

        if (_redis.IsConnected)
        {
            try
            {
                var db = _redis.GetDatabase();
                var batch = db.CreateBatch();
                var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                var tasks = new Dictionary<Guid, Task<double?>>(userIds.Count);

                foreach (var id in userIds)
                {
                    tasks[id] = batch.SortedSetScoreAsync(OnlineUsersZSetKey, id.ToString());
                }

                batch.Execute(); // Dispatches all score checks in a single TCP payload
                await Task.WhenAll(tasks.Values);

                return tasks.ToDictionary(
                    kv => kv.Key,
                    kv => kv.Value.Result.HasValue && kv.Value.Result.Value > now
                );
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis error during AreUsersOnlineAsync, falling back to in-memory");
            }
        }

        // Fallback in-memory resolution
        return userIds.ToDictionary(
            id => id,
            id => _fallbackOnlineUsers.TryGetValue(id, out var conns) && conns.Count > 0
        );
    }

    public async Task<IReadOnlyCollection<Guid>> GetOnlineUsersAsync()
    {
        if (_redis.IsConnected)
        {
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
            }
        }

        return _fallbackOnlineUsers.Keys.ToList().AsReadOnly();
    }

    public async Task<IReadOnlyCollection<string>> GetConnectionsForUserAsync(Guid userId)
    {
        if (_redis.IsConnected)
        {
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
            }
        }

        if (_fallbackOnlineUsers.TryGetValue(userId, out var connections))
        {
            lock (connections)
            {
                return connections.ToList().AsReadOnly();
            }
        }

        return Array.Empty<string>();
    }
}
