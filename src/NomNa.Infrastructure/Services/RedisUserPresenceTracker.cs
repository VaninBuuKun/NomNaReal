using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;
using NomNa.Application.Common.Interfaces;
using StackExchange.Redis;

namespace NomNa.Infrastructure.Services;

/// <summary>
/// Quản lý trạng thái hiện diện người dùng (Online/Offline/Connections) thời gian thực bằng Redis.
/// Hỗ trợ Multi-device (1 User có nhiều kết nối đồng thời) và Multi-instance (Scale-out ngang nhiều server).
/// Có cơ chế tự động fallback về In-Memory an toàn nếu Redis gặp sự cố tạm thời.
/// </summary>
public class RedisUserPresenceTracker : IUserPresenceTracker
{
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<RedisUserPresenceTracker> _logger;

    private const string OnlineUsersSetKey = "nomna:presence:online_users";
    private const string UserConnectionsKeyPrefix = "nomna:presence:user:";

    // Fallback in-memory dictionary khi Redis không kết nối được
    private static readonly ConcurrentDictionary<Guid, HashSet<string>> _fallbackOnlineUsers = new();

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

                // 1. Thêm connectionId vào Set của User và đặt thời gian sống an toàn (24h)
                await db.SetAddAsync(userKey, connectionId);
                await db.KeyExpireAsync(userKey, TimeSpan.FromHours(24));

                // 2. Thêm userId vào Set online_users toàn hệ thống.
                // SADD trả về true NẾU phần tử chưa tồn tại trong Set (tức là kết nối đầu tiên của User).
                var isFirstConnection = await db.SetAddAsync(OnlineUsersSetKey, userId.ToString());
                return isFirstConnection;
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

                // 1. Xoá connectionId khỏi Set kết nối của User
                await db.SetRemoveAsync(userKey, connectionId);

                // 2. Kiểm tra số lượng kết nối còn lại
                var remaining = await db.SetLengthAsync(userKey);
                if (remaining == 0)
                {
                    // Đã đóng tất cả thiết bị/tab -> User thực sự Offline
                    await db.KeyDeleteAsync(userKey);
                    await db.SetRemoveAsync(OnlineUsersSetKey, userId.ToString());
                    return true;
                }

                return false;
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

    public async Task<bool> IsUserOnlineAsync(Guid userId)
    {
        if (_redis.IsConnected)
        {
            try
            {
                var db = _redis.GetDatabase();
                return await db.SetContainsAsync(OnlineUsersSetKey, userId.ToString());
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis error during IsUserOnlineAsync for {UserId}", userId);
            }
        }

        return _fallbackOnlineUsers.TryGetValue(userId, out var conns) && conns.Count > 0;
    }

    public async Task<IReadOnlyCollection<Guid>> GetOnlineUsersAsync()
    {
        if (_redis.IsConnected)
        {
            try
            {
                var db = _redis.GetDatabase();
                var members = await db.SetMembersAsync(OnlineUsersSetKey);
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
                return members.Select(m => m.ToString()).ToList().AsReadOnly();
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
