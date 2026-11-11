using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Domain.Enums;
using NomNa.Shared.Constants;

namespace NomNa.WebAPI.Hubs;

/// <summary>
/// Partial class handling channel groups and ephemeral events (typing indicators).
/// </summary>
public partial class ChatHub
{
    /// <summary>
    /// Subscribes connection to a channel group to receive real-time message multicasts.
    /// Performs permission check before registering the connection to the SignalR group.
    /// </summary>
    public async Task JoinChannel(Guid channelId)
    {
        // 1. Verify authenticated user identity from claims
        if (!Guid.TryParse(Context.UserIdentifier, out var userId))
        {
            throw new HubException("User is not authenticated.");
        }

        // 2. Query channel and verify permissions within a transient scope
        using (var scope = _scopeFactory.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
            var channel = await db.Channels
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == channelId);

            if (channel == null)
            {
                throw new HubException("Channel not found.");
            }

            if (channel.Type != ChannelType.DirectMessage)
            {
                var permService = scope.ServiceProvider.GetRequiredService<IPermissionService>();
                var canView = await permService.HasChannelPermissionAsync(userId, channel.Id, Permissions.ViewChannel);
                if (!canView)
                {
                    throw new HubException("Access denied: You do not have permission to view this channel.");
                }
            }
            else
            {
                var isMember = await db.ChannelMembers
                    .AnyAsync(cm => cm.ChannelId == channel.Id && cm.UserId == userId);
                if (!isMember && channel.CreatedById != userId)
                {
                    throw new HubException("Access denied to this direct message.");
                }
            }
        }

        // 3. Register current ConnectionId into the channel group mapping
        var groupName = channelId.ToString();
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

        if (!Context.Items.TryGetValue("JoinedChannels", out var joinedObj) || joinedObj is not HashSet<Guid> joined)
        {
            joined = new HashSet<Guid>();
            Context.Items["JoinedChannels"] = joined;
        }
        lock (joined)
        {
            joined.Add(channelId);
        }

        _logger.LogInformation("User {UserId} joined SignalR group {ChannelId}", Context.UserIdentifier, channelId);
    }

    /// <summary>
    /// Unsubscribes connection from a channel group upon navigation or tab switch.
    /// </summary>
    public async Task LeaveChannel(Guid channelId)
    {
        var groupName = channelId.ToString();
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);

        if (Context.Items.TryGetValue("JoinedChannels", out var joinedObj) && joinedObj is HashSet<Guid> joined)
        {
            lock (joined)
            {
                joined.Remove(channelId);
            }
        }

        _logger.LogInformation("User {UserId} left SignalR group {ChannelId}", Context.UserIdentifier, channelId);
    }

    /// <summary>
    /// Broadcasts ephemeral typing indicator to other users currently viewing the channel.
    /// Throttled to at most once per 1.5 seconds per connection per channel.
    /// </summary>
    public async Task StartTyping(string channelId)
    {
        if (string.IsNullOrWhiteSpace(channelId) || channelId.StartsWith("pending-dm-", StringComparison.OrdinalIgnoreCase))
            return;

        if (!Guid.TryParse(channelId, out var chGuid))
            return;

        // Verify caller's connection has joined this channel
        if (!Context.Items.TryGetValue("JoinedChannels", out var joinedObj) || joinedObj is not HashSet<Guid> joined)
            return;

        lock (joined)
        {
            if (!joined.Contains(chGuid))
                return;
        }

        // Throttle typing events: max 1 broadcast per 1.5 seconds per connection per channel
        var throttleKey = $"typing_throttle_{channelId}";
        var now = DateTime.UtcNow;
        if (Context.Items.TryGetValue(throttleKey, out var lastTypingObj) && lastTypingObj is DateTime lastTyping)
        {
            if ((now - lastTyping).TotalSeconds < 1.5)
                return;
        }
        Context.Items[throttleKey] = now;

        var groupName = channelId;
        var username = Context.User?.FindFirstValue(ClaimTypes.Name) ?? "Someone";
        var userId = Context.UserIdentifier;

        await Clients.OthersInGroup(groupName).SendAsync(SignalRConstants.Events.UserTyping, new
        {
            channelId,
            userId,
            username
        });
    }

    /// <summary>
    /// Broadcasts stop-typing event to clear typing indicators on peer client UIs.
    /// </summary>
    public async Task StopTyping(string channelId)
    {
        if (string.IsNullOrWhiteSpace(channelId) || channelId.StartsWith("pending-dm-", StringComparison.OrdinalIgnoreCase))
            return;

        if (!Guid.TryParse(channelId, out var chGuid))
            return;

        if (!Context.Items.TryGetValue("JoinedChannels", out var joinedObj) || joinedObj is not HashSet<Guid> joined)
            return;

        lock (joined)
        {
            if (!joined.Contains(chGuid))
                return;
        }

        var groupName = channelId;
        var userId = Context.UserIdentifier;

        await Clients.OthersInGroup(groupName).SendAsync(SignalRConstants.Events.UserStoppedTyping, new
        {
            channelId,
            userId
        });
    }
}
