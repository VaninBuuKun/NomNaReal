using System.Collections.Concurrent;
using NomNa.Application.Common.Interfaces;

namespace NomNa.Infrastructure.Services;

public class UserPresenceTracker : IUserPresenceTracker
{
    private static readonly ConcurrentDictionary<Guid, HashSet<string>> OnlineUsers = new();

    public Task<bool> UserConnectedAsync(Guid userId, string connectionId)
    {
        var isFirstConnection = false;

        OnlineUsers.AddOrUpdate(
            userId,
            _ =>
            {
                isFirstConnection = true;
                return new HashSet<string> { connectionId };
            },
            (_, connections) =>
            {
                lock (connections)
                {
                    if (connections.Count == 0)
                    {
                        isFirstConnection = true;
                    }
                    connections.Add(connectionId);
                }
                return connections;
            });

        return Task.FromResult(isFirstConnection);
    }

    public Task<bool> UserDisconnectedAsync(Guid userId, string connectionId)
    {
        var isLastConnection = false;

        if (OnlineUsers.TryGetValue(userId, out var connections))
        {
            lock (connections)
            {
                connections.Remove(connectionId);
                if (connections.Count == 0)
                {
                    isLastConnection = true;
                }
            }

            if (isLastConnection)
            {
                OnlineUsers.TryRemove(userId, out _);
            }
        }

        return Task.FromResult(isLastConnection);
    }

    public Task<bool> IsUserOnlineAsync(Guid userId)
    {
        var isOnline = OnlineUsers.TryGetValue(userId, out var connections) && connections.Count > 0;
        return Task.FromResult(isOnline);
    }

    public Task<IReadOnlyCollection<Guid>> GetOnlineUsersAsync()
    {
        IReadOnlyCollection<Guid> onlineUserIds = OnlineUsers.Keys.ToList().AsReadOnly();
        return Task.FromResult(onlineUserIds);
    }
}
