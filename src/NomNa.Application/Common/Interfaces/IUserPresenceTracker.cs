namespace NomNa.Application.Common.Interfaces;

public interface IUserPresenceTracker
{
    Task<bool> UserConnectedAsync(Guid userId, string connectionId);
    Task<bool> UserDisconnectedAsync(Guid userId, string connectionId);
    Task<bool> IsUserOnlineAsync(Guid userId);
    Task<IReadOnlyCollection<Guid>> GetOnlineUsersAsync();
}
