using NomNa.Domain.Enums;

namespace NomNa.Application.Common.Interfaces;

public interface IPermissionService
{
    Task<Permissions> GetChannelPermissionsAsync(Guid userId, Guid channelId, CancellationToken cancellationToken = default);
    Task<Permissions> GetServerPermissionsAsync(Guid userId, Guid serverId, CancellationToken cancellationToken = default);
    Task<bool> HasChannelPermissionAsync(Guid userId, Guid channelId, Permissions requiredPermission, CancellationToken cancellationToken = default);
    Task<bool> HasServerPermissionAsync(Guid userId, Guid serverId, Permissions requiredPermission, CancellationToken cancellationToken = default);
}
