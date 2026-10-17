namespace NomNa.Application.Common.Interfaces;

public interface IRealtimeAccessRevoker
{
    Task RevokeServerAccessAsync(Guid userId, Guid serverId, IEnumerable<Guid> channelIds, CancellationToken cancellationToken = default);
    Task RevokeChannelAccessAsync(Guid userId, Guid channelId, CancellationToken cancellationToken = default);
}
