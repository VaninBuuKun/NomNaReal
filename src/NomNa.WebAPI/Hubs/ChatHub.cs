using System.Collections.Concurrent;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Helpers;
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
    private readonly IVoiceRoomManager _voiceRoomManager;
    private readonly ICallSignalingManager _callSignalingManager;
    private readonly IServiceScopeFactory _scopeFactory;

    public ChatHub(
        ISender mediator,
        ILogger<ChatHub> logger,
        IUserPresenceTracker presenceTracker,
        IVoiceRoomManager voiceRoomManager,
        ICallSignalingManager callSignalingManager,
        IServiceScopeFactory scopeFactory)
    {
        _mediator = mediator;
        _logger = logger;
        _presenceTracker = presenceTracker;
        _voiceRoomManager = voiceRoomManager;
        _callSignalingManager = callSignalingManager;
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
    /// Handles multi-device presence tracking and registers the connection into mutual server groups.
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        var userIdStr = Context.UserIdentifier;
        _logger.LogInformation("Client connected: {ConnectionId} (User: {UserId})", Context.ConnectionId, userIdStr);

        if (Guid.TryParse(userIdStr, out var userId))
        {
            List<Guid> serverIds;
            List<Guid> dmChannelIds;
            UserStatusPreference statusPreference = UserStatusPreference.Online;

            using (var scope = _scopeFactory.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

                // 1. Subscribe connection to all servers the user belongs to
                serverIds = await db.ServerMembers.AsNoTracking()
                    .Where(sm => sm.UserId == userId)
                    .Select(sm => sm.ServerId)
                    .ToListAsync();

                // 2. Query all Direct Message channels the user participates in
                dmChannelIds = await db.ChannelMembers.AsNoTracking()
                    .Where(cm => cm.UserId == userId && cm.Channel.Type == ChannelType.DirectMessage)
                    .Select(cm => cm.ChannelId)
                    .ToListAsync();

                statusPreference = await db.Users.AsNoTracking()
                    .Where(u => u.Id == userId)
                    .Select(u => (UserStatusPreference?)u.StatusPreference)
                    .FirstOrDefaultAsync() ?? UserStatusPreference.Online;
            }

            // Join server groups in SignalR
            foreach (var serverId in serverIds)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"server_{serverId}");
            }
            Context.Items["UserServers"] = serverIds;

            // Join DM channel groups in SignalR to receive real-time direct messages across any view
            foreach (var dmId in dmChannelIds)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, dmId.ToString());
            }
            Context.Items["UserDmChannels"] = new HashSet<Guid>(dmChannelIds);

            // 3. Track connection lease in Redis. Returns true if this is the user's first connection (Offline -> Online)
            var becameOnline = await _presenceTracker.UserConnectedAsync(userId, Context.ConnectionId);
            if (becameOnline)
            {
                var resolvedStatus = UserPresenceResolver.Resolve(isOnlineInRedis: true, statusPreference);

                // If user preference is Invisible, resolved status is "offline" -> Do NOT announce online status
                if (resolvedStatus != "offline")
                {
                    await BroadcastPresenceToPeersAsync(userId, resolvedStatus, serverIds);
                }
            }
        }
        
        await base.OnConnectedAsync();
    }

    /// <summary>
    /// Invoked when a WebSocket or transport connection is disconnected.
    /// Cleans up active call state and broadcasts offline presence only when all connections terminate.
    /// </summary>
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userIdStr = Context.UserIdentifier;
        _logger.LogInformation("Client disconnected: {ConnectionId} (User: {UserId})", Context.ConnectionId, userIdStr);

        if (Guid.TryParse(userIdStr, out var userId))
        {
            // Clean up any voice channel room the user was connected to
            await CleanupUserVoiceChannelsAsync(userId);

            // If user disconnects during an active call, notify partner with CallEnded
            var partnerId = await _callSignalingManager.CleanupCallForUserAsync(userId);
            if (partnerId.HasValue)
            {
                try
                {
                    await Clients.User(partnerId.Value.ToString()).SendAsync(
                        SignalRConstants.Events.CallEnded,
                        new CallEndedPayload(userId));
                    _logger.LogInformation("Disconnected user {UserId} had active call with {PartnerId}, dispatched CallEnded", userId, partnerId.Value);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to dispatch CallEnded on disconnect to partner {PartnerId}", partnerId.Value);
                }
            }

            // _presenceTracker returns true if all connections of the user are closed (User is truly offline)
            var becameOffline = await _presenceTracker.UserDisconnectedAsync(userId, Context.ConnectionId);
            if (becameOffline)
            {
                List<Guid> serverIds;
                UserStatusPreference statusPreference = UserStatusPreference.Online;

                using (var scope = _scopeFactory.CreateScope())
                {
                    var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

                    statusPreference = await db.Users.AsNoTracking()
                        .Where(u => u.Id == userId)
                        .Select(u => (UserStatusPreference?)u.StatusPreference)
                        .FirstOrDefaultAsync() ?? UserStatusPreference.Online;

                    serverIds = Context.Items.TryGetValue("UserServers", out var sObj) && sObj is List<Guid> sList
                        ? sList
                        : await db.ServerMembers.AsNoTracking()
                            .Where(sm => sm.UserId == userId)
                            .Select(sm => sm.ServerId)
                            .ToListAsync();
                }

                // If user was Invisible, they already appeared offline to everyone; do not duplicate broadcast
                if (statusPreference != UserStatusPreference.Invisible)
                {
                    await BroadcastPresenceToPeersAsync(userId, "offline", serverIds);
                }
            }
        }
        
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Updates the user's status preference (Online, Idle, DoNotDisturb, Invisible) in real-time.
    /// Resolves effective status against active Redis lease and dispatches to mutual peers.
    /// </summary>
    public async Task SetStatusPreference(UserStatusPreference preference)
    {
        if (!Guid.TryParse(Context.UserIdentifier, out var userId))
        {
            throw new HubException("User is not authenticated.");
        }

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
        {
            throw new HubException("User not found.");
        }

        user.UpdateStatusPreference(preference);
        await db.SaveChangesAsync();

        var isOnlineInRedis = await _presenceTracker.IsUserOnlineAsync(userId);
        var resolvedStatus = UserPresenceResolver.Resolve(isOnlineInRedis, preference);

        var serverIds = Context.Items.TryGetValue("UserServers", out var sObj) && sObj is List<Guid> sList
            ? sList
            : await db.ServerMembers.AsNoTracking()
                .Where(sm => sm.UserId == userId)
                .Select(sm => sm.ServerId)
                .ToListAsync();

        await BroadcastPresenceToPeersAsync(userId, resolvedStatus, serverIds);
    }

    /// <summary>
    /// Subscribes connection to a server group to receive scoped server events and presence.
    /// </summary>
    public async Task JoinServer(Guid serverId)
    {
        if (!Guid.TryParse(Context.UserIdentifier, out var userId))
        {
            throw new HubException("User is not authenticated.");
        }

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

        var isMember = await db.ServerMembers.AsNoTracking()
            .AnyAsync(sm => sm.ServerId == serverId && sm.UserId == userId);

        if (!isMember)
        {
            throw new HubException("Access denied: You are not a member of this server.");
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, $"server_{serverId}");

        if (Context.Items.TryGetValue("UserServers", out var sObj) && sObj is List<Guid> sList)
        {
            lock (sList)
            {
                if (!sList.Contains(serverId)) sList.Add(serverId);
            }
        }
    }

    /// <summary>
    /// Unsubscribes connection from a server group when leaving or being removed from a server.
    /// </summary>
    public async Task LeaveServer(Guid serverId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"server_{serverId}");

        if (Context.Items.TryGetValue("UserServers", out var sObj) && sObj is List<Guid> sList)
        {
            lock (sList)
            {
                sList.Remove(serverId);
            }
        }
    }

    /// <summary>
    /// Scopes presence status updates strictly to mutual server groups and direct friends.
    /// Eliminates O(N^2) global Clients.All broadcast storms and protects user privacy.
    /// </summary>
    private async Task BroadcastPresenceToPeersAsync(Guid userId, string status, List<Guid> serverIds)
    {
        var payload = new
        {
            userId = userId.ToString(),
            status
        };

        // 0. Dispatch to caller / user's own connections (for multi-device / multi-tab synchronization)
        await Clients.User(userId.ToString()).SendAsync(SignalRConstants.Events.UserStatusChanged, payload);

        // 1. Multicast to all mutual server groups
        if (serverIds.Count > 0)
        {
            var serverGroupNames = serverIds.Select(id => $"server_{id}").ToList();
            await Clients.Groups(serverGroupNames).SendAsync(SignalRConstants.Events.UserStatusChanged, payload);
        }

        // 2. Multicast to accepted friends (who might not share any mutual server)
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

        var friendIds = await db.Friendships.AsNoTracking()
            .Where(f => f.Status == FriendshipStatus.Accepted && (f.RequesterId == userId || f.AddresseeId == userId))
            .Select(f => f.RequesterId == userId ? f.AddresseeId : f.RequesterId)
            .ToListAsync();

        if (friendIds.Count > 0)
        {
            var friendIdStrings = friendIds.Select(id => id.ToString()).ToList();
            await Clients.Users(friendIdStrings).SendAsync(SignalRConstants.Events.UserStatusChanged, payload);
        }
    }

    #endregion
}