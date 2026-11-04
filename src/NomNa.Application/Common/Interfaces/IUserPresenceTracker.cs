namespace NomNa.Application.Common.Interfaces;

public interface IUserPresenceTracker
{
    Task<bool> UserConnectedAsync(Guid userId, string connectionId);
    Task<bool> UserDisconnectedAsync(Guid userId, string connectionId);
    Task HeartbeatAsync(Guid userId, string connectionId);
    Task<bool> IsUserOnlineAsync(Guid userId);
    Task<IReadOnlyDictionary<Guid, bool>> AreUsersOnlineAsync(IReadOnlyCollection<Guid> userIds);
    Task<IReadOnlyCollection<Guid>> GetOnlineUsersAsync();
    Task<IReadOnlyCollection<string>> GetConnectionsForUserAsync(Guid userId);
}
