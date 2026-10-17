using Microsoft.AspNetCore.SignalR;
using NomNa.Application.Common.Interfaces;
using NomNa.Shared.Constants;
using NomNa.WebAPI.Hubs;

namespace NomNa.WebAPI.Services;

public class RealtimeAccessRevoker : IRealtimeAccessRevoker
{
    private readonly IHubContext<ChatHub> _hubContext;
    private readonly IUserPresenceTracker _presenceTracker;
    private readonly ILogger<RealtimeAccessRevoker> _logger;

    public RealtimeAccessRevoker(
        IHubContext<ChatHub> hubContext,
        IUserPresenceTracker presenceTracker,
        ILogger<RealtimeAccessRevoker> logger)
    {
        _hubContext = hubContext;
        _presenceTracker = presenceTracker;
        _logger = logger;
    }

    public async Task RevokeServerAccessAsync(Guid userId, Guid serverId, IEnumerable<Guid> channelIds, CancellationToken cancellationToken = default)
    {
        try
        {
            var connections = await _presenceTracker.GetConnectionsForUserAsync(userId);
            foreach (var connId in connections)
            {
                foreach (var chId in channelIds)
                {
                    try
                    {
                        await _hubContext.Groups.RemoveFromGroupAsync(connId, chId.ToString(), cancellationToken);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogDebug(ex, "Failed to remove connection {ConnId} from group {ChannelId}", connId, chId);
                    }
                }
            }

            // Broadcast to the user that they were removed from the server
            await _hubContext.Clients.User(userId.ToString())
                .SendAsync(SignalRConstants.Events.RemovedFromServer, new { serverId }, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to revoke server access for user {UserId} in server {ServerId}", userId, serverId);
        }
    }

    public async Task RevokeChannelAccessAsync(Guid userId, Guid channelId, CancellationToken cancellationToken = default)
    {
        try
        {
            var connections = await _presenceTracker.GetConnectionsForUserAsync(userId);
            foreach (var connId in connections)
            {
                try
                {
                    await _hubContext.Groups.RemoveFromGroupAsync(connId, channelId.ToString(), cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "Failed to remove connection {ConnId} from group {ChannelId}", connId, channelId);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to revoke channel access for user {UserId} in channel {ChannelId}", userId, channelId);
        }
    }
}
