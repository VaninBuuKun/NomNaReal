using System.Collections.Concurrent;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Domain.Enums;
using NomNa.Shared.Constants;
using NomNa.Shared.Models;

namespace NomNa.WebAPI.Hubs;

/// <summary>
/// SignalR ChatHub: Real-time gateway endpoint for chat messaging, WebRTC signaling, and user presence.
/// [Authorize]: Requires all WebSocket and transport connections to be authenticated via JWT bearer token.
/// Hub instances are transient (created and disposed per invocation/RPC call from client).
/// Split across multiple partial classes:
/// - ChatHub.cs: Constructor, DI dependencies, connection & presence lifecycle.
/// - ChatHub.Channels.cs: Group join/leave, typing indicator.
/// - ChatHub.Messages.cs: Message creation, editing, deletion, and reactions.
/// - ChatHub.CallSignaling.cs: WebRTC 1v1 audio/video call signaling.
/// </summary>
[Authorize]
public partial class ChatHub : Hub
{
    private readonly ISender _mediator;
    private readonly ILogger<ChatHub> _logger;
    private readonly IUserPresenceTracker _presenceTracker;
    private readonly IServiceScopeFactory _scopeFactory;

    // Track active 1v1 call pairings (UserId <-> PeerUserId) across connections
    private static readonly ConcurrentDictionary<Guid, Guid> _activeCalls = new();

    public ChatHub(
        ISender mediator,
        ILogger<ChatHub> logger,
        IUserPresenceTracker presenceTracker,
        IServiceScopeFactory scopeFactory)
    {
        _mediator = mediator;
        _logger = logger;
        _presenceTracker = presenceTracker;
        _scopeFactory = scopeFactory;
    }

    #region Presence & Connection Lifecycle (OnConnected / OnDisconnected)

    /// <summary>
    /// Retrieves the list of currently online user IDs from the presence tracker.
    /// </summary>
    public async Task<IReadOnlyCollection<string>> GetOnlineUsers()
    {
        var onlineUsers = await _presenceTracker.GetOnlineUsersAsync();
        return onlineUsers.Select(u => u.ToString()).ToList();
    }

    /// <summary>
    /// Periodic heartbeat endpoint sent by clients (e.g. every 25s) to renew connection lease in Redis.
    /// Enables automatic online status expiration if a client crashes or abruptly loses connection.
    /// </summary>
    public async Task PingPresence()
    {
        if (Guid.TryParse(Context.UserIdentifier, out var userId))
        {
            await _presenceTracker.HeartbeatAsync(userId, Context.ConnectionId);
        }
    }

    /// <summary>
    /// Invoked when a new WebSocket or transport connection is established.
    /// Handles multi-device presence tracking (one user may have multiple active tabs or devices).
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        var userIdStr = Context.UserIdentifier;
        _logger.LogInformation("Client connected: {ConnectionId} (User: {UserId})", Context.ConnectionId, userIdStr);

        if (Guid.TryParse(userIdStr, out var userId))
        {
            // _presenceTracker returns true if this is the user's first active connection (Offline -> Online)
            var becameOnline = await _presenceTracker.UserConnectedAsync(userId, Context.ConnectionId);
            if (becameOnline)
            {
                await Clients.All.SendAsync(SignalRConstants.Events.UserStatusChanged, new
                {
                    userId = userId.ToString(),
                    status = "online"
                });
            }
        }
        
        await base.OnConnectedAsync();
    }

    /// <summary>
    /// Invoked when a WebSocket or transport connection is disconnected.
    /// Cleans up active call state and updates presence when all connections for a user terminate.
    /// </summary>
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userIdStr = Context.UserIdentifier;
        _logger.LogInformation("Client disconnected: {ConnectionId} (User: {UserId})", Context.ConnectionId, userIdStr);

        if (Guid.TryParse(userIdStr, out var userId))
        {
            // If user disconnects during an active call, notify partner with CallEnded
            if (_activeCalls.TryRemove(userId, out var partnerId))
            {
                _activeCalls.TryRemove(partnerId, out _);
                try
                {
                    await Clients.User(partnerId.ToString()).SendAsync(
                        SignalRConstants.Events.CallEnded,
                        new CallEndedPayload(userId));
                    _logger.LogInformation("Disconnected user {UserId} had active call with {PartnerId}, dispatched CallEnded", userId, partnerId);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to dispatch CallEnded on disconnect to partner {PartnerId}", partnerId);
                }
            }

            // _presenceTracker returns true if all connections of the user are closed (User is truly offline)
            var becameOffline = await _presenceTracker.UserDisconnectedAsync(userId, Context.ConnectionId);
            if (becameOffline)
            {
                await Clients.All.SendAsync(SignalRConstants.Events.UserStatusChanged, new
                {
                    userId = userId.ToString(),
                    status = "offline"
                });
            }
        }
        
        await base.OnDisconnectedAsync(exception);
    }

    #endregion
}