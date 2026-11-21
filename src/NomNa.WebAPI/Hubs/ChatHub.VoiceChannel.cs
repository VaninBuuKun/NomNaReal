using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Domain.Enums;
using NomNa.Shared.Constants;
using NomNa.Shared.Models;

namespace NomNa.WebAPI.Hubs;

/// <summary>
/// Partial class handling multi-user Voice Channel room presence, state transitions, and WebRTC signaling.
/// Utilizes the distributed IVoiceRoomManager (Redis-backed) to prevent split-brain state across cluster nodes.
/// </summary>
public partial class ChatHub
{
    /// <summary>
    /// Retrieves all active voice channel participants across a server so the sidebar can display live voice rosters.
    /// Queries the distributed Redis store to support multi-node clusters.
    /// </summary>
    public async Task<IReadOnlyCollection<VoiceParticipantPayload>> GetServerVoiceParticipants(Guid serverId)
    {
        if (!Guid.TryParse(Context.UserIdentifier, out _))
        {
            return Array.Empty<VoiceParticipantPayload>();
        }

        var voiceChannelIds = new List<Guid>();
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
            voiceChannelIds = await db.Channels.AsNoTracking()
                .Where(c => c.ServerId == serverId && c.Type == ChannelType.Voice)
                .Select(c => c.Id)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to query voice channels for server {ServerId}", serverId);
        }

        return await _voiceRoomManager.GetServerParticipantsAsync(serverId, voiceChannelIds);
    }

    /// <summary>
    /// Joins a real-time Voice Channel, verifies permissions, registers user in group, and syncs room roster.
    /// </summary>
    public async Task JoinVoiceChannel(Guid channelId, bool isMuted = false, bool isDeafened = false)
    {
        if (!Guid.TryParse(Context.UserIdentifier, out var userId))
        {
            throw new HubException("User is not authenticated.");
        }

        // Leave previous voice channel if user was already connected elsewhere
        var previousChannelId = await _voiceRoomManager.GetUserVoiceChannelAsync(userId);
        if (previousChannelId.HasValue && previousChannelId.Value != channelId)
        {
            await LeaveVoiceChannel(previousChannelId.Value);
        }

        // Fetch user profile info and verify channel permissions from DbContext
        string displayName = Context.User?.FindFirstValue(ClaimTypes.Name) ?? "User";
        string? avatarUrl = null;
        Guid? serverId = null;

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

            var channel = await db.Channels.AsNoTracking().FirstOrDefaultAsync(c => c.Id == channelId);
            if (channel != null)
            {
                serverId = channel.ServerId;

                var permService = scope.ServiceProvider.GetService<IPermissionService>();
                if (permService != null)
                {
                    var canView = await permService.HasChannelPermissionAsync(userId, channelId, Permissions.ViewChannel);
                    var canConnect = await permService.HasChannelPermissionAsync(userId, channelId, Permissions.Connect);
                    if (!canView || !canConnect)
                    {
                        throw new HubException("Access denied: You do not have permission to connect to this voice channel.");
                    }

                    var canSpeak = await permService.HasChannelPermissionAsync(userId, channelId, Permissions.Speak);
                    if (!canSpeak)
                    {
                        isMuted = true;
                    }
                }
            }

            var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
            if (user != null)
            {
                displayName = !string.IsNullOrWhiteSpace(user.DisplayName) ? user.DisplayName : user.UserName ?? displayName;
                avatarUrl = user.AvatarUrl;
            }
        }
        catch (HubException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to resolve user profile or permissions for voice channel {ChannelId}", channelId);
        }

        var groupName = $"voice_{channelId}";
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        if (serverId.HasValue)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"server_{serverId.Value}");
        }

        var participant = new VoiceParticipantPayload(
            userId,
            channelId,
            displayName,
            avatarUrl,
            isMuted,
            isDeafened,
            IsSpeaking: false,
            IsScreenSharing: false,
            IsCameraActive: false);

        await _voiceRoomManager.SetUserVoiceAsync(channelId, serverId ?? Guid.Empty, participant);

        var roomParticipants = await _voiceRoomManager.GetParticipantsAsync(channelId);

        _logger.LogInformation("User {UserId} ({DisplayName}) joined voice channel {ChannelId}. Room size: {Count}",
            userId, displayName, channelId, roomParticipants.Count);

        // 1. Send currently connected room participants list to the joining user
        await Clients.Caller.SendAsync(SignalRConstants.Events.CurrentVoiceParticipants, roomParticipants);

        // 2. Broadcast to all other participants in the voice room and server group that a peer joined
        await Clients.OthersInGroup(groupName).SendAsync(SignalRConstants.Events.UserJoinedVoice, participant);
        if (serverId.HasValue)
        {
            await Clients.Group($"server_{serverId.Value}").SendAsync(SignalRConstants.Events.UserJoinedVoice, participant);
        }

        // Also send direct notification to all remaining participants in the room by UserId for guaranteed delivery
        var otherParticipantIds = roomParticipants
            .Where(p => p.UserId != userId)
            .Select(p => p.UserId.ToString())
            .ToList();
        if (otherParticipantIds.Count > 0)
        {
            await Clients.Users(otherParticipantIds).SendAsync(SignalRConstants.Events.UserJoinedVoice, participant);
        }
    }

    /// <summary>
    /// Leaves a Voice Channel room and notifies all peer participants and server sidebar listeners.
    /// </summary>
    public async Task LeaveVoiceChannel(Guid channelId)
    {
        if (!Guid.TryParse(Context.UserIdentifier, out var userId))
        {
            return;
        }

        var groupName = $"voice_{channelId}";
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);

        var (exitedChId, serverId, remainingUserIds) = await _voiceRoomManager.RemoveUserVoiceAsync(userId, channelId);

        _logger.LogInformation("User {UserId} left voice channel {ChannelId}", userId, channelId);

        var leftPayload = new VoiceUserLeftPayload(channelId, userId);
        await Clients.Group(groupName).SendAsync(SignalRConstants.Events.UserLeftVoice, leftPayload);

        if (remainingUserIds.Count > 0)
        {
            var userIdsString = remainingUserIds.Select(id => id.ToString()).ToList();
            await Clients.Users(userIdsString).SendAsync(SignalRConstants.Events.UserLeftVoice, leftPayload);
        }

        if (serverId.HasValue && serverId.Value != Guid.Empty)
        {
            await Clients.Group($"server_{serverId.Value}").SendAsync(SignalRConstants.Events.UserLeftVoice, leftPayload);
        }
    }

    /// <summary>
    /// Updates real-time participant voice state (mute, deafen, speaking, screen share, camera).
    /// </summary>
    public async Task UpdateVoiceState(
        Guid channelId,
        bool isMuted,
        bool isDeafened,
        bool isSpeaking,
        bool isScreenSharing,
        bool isCameraActive)
    {
        if (!Guid.TryParse(Context.UserIdentifier, out var userId))
        {
            return;
        }

        var updated = await _voiceRoomManager.UpdateVoiceStateAsync(
            channelId,
            userId,
            isMuted,
            isDeafened,
            isSpeaking,
            isScreenSharing,
            isCameraActive);

        if (updated != null)
        {
            var payload = new VoiceStateChangedPayload(
                channelId,
                userId,
                isMuted,
                isDeafened,
                isSpeaking,
                isScreenSharing,
                isCameraActive);

            await Clients.OthersInGroup($"voice_{channelId}").SendAsync(
                SignalRConstants.Events.VoiceStateChanged,
                payload);

            var serverId = await _voiceRoomManager.GetChannelServerIdAsync(channelId);
            if (serverId.HasValue && serverId.Value != Guid.Empty)
            {
                await Clients.OthersInGroup($"server_{serverId.Value}").SendAsync(
                    SignalRConstants.Events.VoiceStateChanged,
                    payload);
            }
        }
    }

    /// <summary>
    /// Forwards WebRTC peer-to-peer signaling packets (Offer/Answer/Candidate) between verified voice participants.
    /// </summary>
    public async Task SendVoiceSignal(Guid channelId, Guid targetUserId, string signalData)
    {
        if (!Guid.TryParse(Context.UserIdentifier, out var senderUserId))
        {
            throw new HubException("User is not authenticated.");
        }

        if (senderUserId == targetUserId)
        {
            return;
        }

        // Distributed security guard: verify both sender and target are actively in the same voice room
        var areCoLocated = await _voiceRoomManager.AreUsersInSameVoiceChannelAsync(channelId, senderUserId, targetUserId);
        if (!areCoLocated)
        {
            _logger.LogWarning(
                "Rejected voice signal in channel {ChannelId} from {SenderId} to {TargetId}: not co-located in room",
                channelId, senderUserId, targetUserId);
            return;
        }

        var payload = new VoiceSignalPayload(channelId, senderUserId, targetUserId, signalData);

        await Clients.User(targetUserId.ToString()).SendAsync(
            SignalRConstants.Events.VoiceSignalReceived,
            payload);
    }

    /// <summary>
    /// Cleans up any active voice channels the user is connected to when their connection terminates.
    /// </summary>
    private async Task CleanupUserVoiceChannelsAsync(Guid userId)
    {
        var (channelId, serverId, remainingUserIds) = await _voiceRoomManager.RemoveUserVoiceAsync(userId);
        if (channelId.HasValue)
        {
            var chId = channelId.Value;
            try
            {
                var leftPayload = new VoiceUserLeftPayload(chId, userId);
                await Clients.Group($"voice_{chId}").SendAsync(
                    SignalRConstants.Events.UserLeftVoice,
                    leftPayload);

                if (remainingUserIds.Count > 0)
                {
                    var userIdsString = remainingUserIds.Select(id => id.ToString()).ToList();
                    await Clients.Users(userIdsString).SendAsync(
                        SignalRConstants.Events.UserLeftVoice,
                        leftPayload);
                }

                if (serverId.HasValue && serverId.Value != Guid.Empty)
                {
                    await Clients.Group($"server_{serverId.Value}").SendAsync(
                        SignalRConstants.Events.UserLeftVoice,
                        leftPayload);
                }

                _logger.LogInformation("Cleaned up voice room on disconnect for user {UserId} in channel {ChannelId}", userId, chId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to broadcast UserLeftVoice on disconnect for user {UserId}", userId);
            }
        }
    }
}
