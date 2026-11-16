using System.Collections.Concurrent;
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
/// </summary>
public partial class ChatHub
{
    // Thread-safe dictionary tracking voice rooms: ChannelId -> (UserId -> VoiceParticipantPayload)
    private static readonly ConcurrentDictionary<Guid, ConcurrentDictionary<Guid, VoiceParticipantPayload>> _voiceRooms = new();

    // Fast reverse index mapping UserId -> ChannelId for instantaneous disconnect cleanup
    private static readonly ConcurrentDictionary<Guid, Guid> _userVoiceChannels = new();

    // Fast lookup mapping Voice ChannelId -> ServerId for server-wide sidebar presence sync
    private static readonly ConcurrentDictionary<Guid, Guid> _channelServers = new();

    /// <summary>
    /// Retrieves all active voice channel participants across a server so the sidebar can display live voice rosters.
    /// </summary>
    public async Task<IReadOnlyCollection<VoiceParticipantPayload>> GetServerVoiceParticipants(Guid serverId)
    {
        if (!Guid.TryParse(Context.UserIdentifier, out _))
        {
            return Array.Empty<VoiceParticipantPayload>();
        }

        // Resolve voice channels belonging to this server if not yet cached in _channelServers
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
            var voiceChannelIds = await db.Channels.AsNoTracking()
                .Where(c => c.ServerId == serverId && c.Type == ChannelType.Voice)
                .Select(c => c.Id)
                .ToListAsync();

            foreach (var chId in voiceChannelIds)
            {
                _channelServers[chId] = serverId;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to query voice channels for server {ServerId}", serverId);
        }

        var result = new List<VoiceParticipantPayload>();
        foreach (var (channelId, room) in _voiceRooms)
        {
            if (_channelServers.TryGetValue(channelId, out var mappedServerId) && mappedServerId == serverId)
            {
                result.AddRange(room.Values);
            }
        }

        return result;
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
        if (_userVoiceChannels.TryGetValue(userId, out var previousChannelId) && previousChannelId != channelId)
        {
            await LeaveVoiceChannel(previousChannelId);
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
                if (serverId.HasValue)
                {
                    _channelServers[channelId] = serverId.Value;
                }

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

        var room = _voiceRooms.GetOrAdd(channelId, _ => new ConcurrentDictionary<Guid, VoiceParticipantPayload>());
        room[userId] = participant;
        _userVoiceChannels[userId] = channelId;

        _logger.LogInformation("User {UserId} ({DisplayName}) joined voice channel {ChannelId}. Room size: {Count}",
            userId, displayName, channelId, room.Count);

        // 1. Send currently connected room participants list to the joining user
        await Clients.Caller.SendAsync(SignalRConstants.Events.CurrentVoiceParticipants, room.Values.ToList());

        // 2. Broadcast to all other participants in the voice room and server group that a peer joined
        if (serverId.HasValue || (_channelServers.TryGetValue(channelId, out var cachedServerId) && (serverId = cachedServerId).HasValue))
        {
            await Clients.Group($"server_{serverId.Value}").SendAsync(SignalRConstants.Events.UserJoinedVoice, participant);
        }
        await Clients.OthersInGroup(groupName).SendAsync(SignalRConstants.Events.UserJoinedVoice, participant);
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

        if (_voiceRooms.TryGetValue(channelId, out var room))
        {
            room.TryRemove(userId, out _);
            if (room.IsEmpty)
            {
                _voiceRooms.TryRemove(channelId, out _);
            }
        }

        if (_userVoiceChannels.TryGetValue(userId, out var currentCh) && currentCh == channelId)
        {
            _userVoiceChannels.TryRemove(userId, out _);
        }

        _logger.LogInformation("User {UserId} left voice channel {ChannelId}", userId, channelId);

        var leftPayload = new VoiceUserLeftPayload(channelId, userId);
        await Clients.Group(groupName).SendAsync(SignalRConstants.Events.UserLeftVoice, leftPayload);

        if (_channelServers.TryGetValue(channelId, out var serverId))
        {
            await Clients.Group($"server_{serverId}").SendAsync(SignalRConstants.Events.UserLeftVoice, leftPayload);
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

        if (_voiceRooms.TryGetValue(channelId, out var room) && room.TryGetValue(userId, out var existing))
        {
            var updated = existing with
            {
                IsMuted = isMuted,
                IsDeafened = isDeafened,
                IsSpeaking = isSpeaking,
                IsScreenSharing = isScreenSharing,
                IsCameraActive = isCameraActive
            };
            room[userId] = updated;

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

            // Also notify server group so sidebar indicators (mute/deafen/speaking/screen) stay synchronized
            if (_channelServers.TryGetValue(channelId, out var serverId))
            {
                await Clients.OthersInGroup($"server_{serverId}").SendAsync(
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

        // Security guard: verify both sender and target are actively in the same voice room
        if (!_voiceRooms.TryGetValue(channelId, out var room) ||
            !room.ContainsKey(senderUserId) ||
            !room.ContainsKey(targetUserId))
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
        if (_userVoiceChannels.TryRemove(userId, out var channelId))
        {
            if (_voiceRooms.TryGetValue(channelId, out var room))
            {
                room.TryRemove(userId, out _);
                if (room.IsEmpty)
                {
                    _voiceRooms.TryRemove(channelId, out _);
                }
            }

            try
            {
                var leftPayload = new VoiceUserLeftPayload(channelId, userId);
                await Clients.Group($"voice_{channelId}").SendAsync(
                    SignalRConstants.Events.UserLeftVoice,
                    leftPayload);

                if (_channelServers.TryGetValue(channelId, out var serverId))
                {
                    await Clients.Group($"server_{serverId}").SendAsync(
                        SignalRConstants.Events.UserLeftVoice,
                        leftPayload);
                }

                _logger.LogInformation("Cleaned up voice room on disconnect for user {UserId} in channel {ChannelId}", userId, channelId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to broadcast UserLeftVoice on disconnect for user {UserId}", userId);
            }
        }
    }
}
