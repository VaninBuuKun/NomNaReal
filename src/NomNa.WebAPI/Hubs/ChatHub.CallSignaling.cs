using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;
using NomNa.Shared.Constants;
using NomNa.Shared.Models;

namespace NomNa.WebAPI.Hubs;

/// <summary>
/// Partial class handling WebRTC 1v1 call signaling RPC endpoints.
/// Synchronized cluster-wide using Redis-backed ICallSignalingManager.
/// Automatically persists call termination and missed call logs to DM channels.
/// </summary>
public partial class ChatHub
{
    /// <summary>
    /// Initiates a 1-1 WebRTC call to targetUserId by dispatching an SDP offer.
    /// Performs presence, busy-state, and friendship block verification before ringing.
    /// </summary>
    public async Task StartCall(Guid targetUserId, string offerSdp, bool isVideoCall)
    {
        if (!Guid.TryParse(Context.UserIdentifier, out var callerId))
        {
            throw new HubException("User is not authenticated.");
        }

        if (callerId == targetUserId)
        {
            throw new HubException("Cannot call yourself.");
        }

        // Verify caller is not already engaged in an active call
        if (await _callSignalingManager.HasActiveCallAsync(callerId))
        {
            var busyPayload = new CallRejectedPayload(targetUserId, "You are already in an active call.");
            await Clients.Caller.SendAsync(SignalRConstants.Events.CallRejected, busyPayload);
            return;
        }

        // Verify callee is not busy in another call
        if (await _callSignalingManager.HasActiveCallAsync(targetUserId))
        {
            var busyPayload = new CallRejectedPayload(targetUserId, "User is currently busy in another call.");
            await Clients.Caller.SendAsync(SignalRConstants.Events.CallRejected, busyPayload);
            return;
        }

        // Check if target user is online
        var isTargetOnline = await _presenceTracker.IsUserOnlineAsync(targetUserId);
        if (!isTargetOnline)
        {
            var offlinePayload = new CallRejectedPayload(targetUserId, "User is currently offline.");
            await Clients.Caller.SendAsync(SignalRConstants.Events.CallRejected, offlinePayload);
            return;
        }

        var callerName = Context.User?.FindFirstValue(ClaimTypes.Name) ?? "User";
        string? callerAvatar = null;

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

            // Verify relationship: block call if either party blocked the other
            var isBlocked = await db.Friendships.AsNoTracking().AnyAsync(f =>
                ((f.RequesterId == callerId && f.AddresseeId == targetUserId) ||
                 (f.RequesterId == targetUserId && f.AddresseeId == callerId)) &&
                f.Status == FriendshipStatus.Blocked);

            if (isBlocked)
            {
                var blockedPayload = new CallRejectedPayload(targetUserId, "Cannot initiate call with this user.");
                await Clients.Caller.SendAsync(SignalRConstants.Events.CallRejected, blockedPayload);
                return;
            }

            var caller = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == callerId);
            if (caller != null)
            {
                callerName = !string.IsNullOrWhiteSpace(caller.DisplayName) ? caller.DisplayName : caller.UserName ?? callerName;
                callerAvatar = caller.AvatarUrl;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load caller user info for call signaling");
        }

        // Record active call intent between caller and callee atomically in Redis (60-second ring timeout)
        var initiated = await _callSignalingManager.TryInitiateCallAsync(callerId, targetUserId, isVideoCall, TimeSpan.FromSeconds(60));
        if (!initiated)
        {
            var busyPayload = new CallRejectedPayload(targetUserId, "User or caller became busy.");
            await Clients.Caller.SendAsync(SignalRConstants.Events.CallRejected, busyPayload);
            return;
        }

        var payload = new CallOfferPayload(callerId, callerName, callerAvatar, targetUserId, offerSdp, isVideoCall);

        _logger.LogInformation("User {CallerId} initiated call to {TargetUserId} (Video: {IsVideo})", callerId, targetUserId, isVideoCall);

        await Clients.User(targetUserId.ToString()).SendAsync(SignalRConstants.Events.CallIncoming, payload);
    }

    /// <summary>
    /// Accepts an incoming call and relays the SDP answer back to the caller.
    /// Transitions distributed call status from ringing to connected in Redis.
    /// </summary>
    public async Task AcceptCall(Guid callerId, string answerSdp)
    {
        if (!Guid.TryParse(Context.UserIdentifier, out var responderId))
        {
            throw new HubException("User is not authenticated.");
        }

        // Verify that callerId has indeed initiated a call to responderId in Redis
        var isPending = await _callSignalingManager.VerifyPendingCallAsync(callerId, responderId);
        if (!isPending)
        {
            throw new HubException("No pending call found from this user.");
        }

        // Atomically transition call state from ringing to connected in Redis
        await _callSignalingManager.TryAcceptCallAsync(callerId, responderId);

        var payload = new CallAnswerPayload(responderId, callerId, answerSdp);

        _logger.LogInformation("User {ResponderId} accepted call from {CallerId}", responderId, callerId);

        await Clients.User(callerId.ToString()).SendAsync(SignalRConstants.Events.CallAccepted, payload);
    }

    /// <summary>
    /// Rejects an incoming call request, cleans up call pairing state in Redis,
    /// and logs a missed call system message to the DM channel.
    /// </summary>
    public async Task RejectCall(Guid callerId, string? reason = null)
    {
        if (!Guid.TryParse(Context.UserIdentifier, out var responderId))
        {
            throw new HubException("User is not authenticated.");
        }

        var term = await _callSignalingManager.TerminateCallAsync(responderId, callerId);

        var payload = new CallRejectedPayload(responderId, reason);

        _logger.LogInformation("User {ResponderId} rejected call from {CallerId} (Reason: {Reason})", responderId, callerId, reason);

        await Clients.User(callerId.ToString()).SendAsync(SignalRConstants.Events.CallRejected, payload);

        // Record missed call system message in DM channel
        var actualCaller = term.WasActive ? term.CallerId : callerId;
        var actualCallee = term.WasActive ? term.CalleeId : responderId;
        _ = RecordCallLogAsync(actualCaller, actualCallee, wasConnected: false, isVideo: term.IsVideo, durationSeconds: 0);
    }

    /// <summary>
    /// Ends an ongoing active call session, dispatches CallEnded to peer,
    /// and logs the call duration system message to the DM channel.
    /// </summary>
    public async Task EndCall(Guid peerUserId)
    {
        if (!Guid.TryParse(Context.UserIdentifier, out var senderId))
        {
            throw new HubException("User is not authenticated.");
        }

        var term = await _callSignalingManager.TerminateCallAsync(senderId, peerUserId);
        if (!term.WasActive)
        {
            return;
        }

        var payload = new CallEndedPayload(senderId);

        _logger.LogInformation(
            "User {SenderId} ended call with {PeerUserId} (Connected: {WasConnected}, Duration: {Duration}s)",
            senderId,
            peerUserId,
            term.WasConnected,
            term.DurationSeconds);

        await Clients.User(peerUserId.ToString()).SendAsync(SignalRConstants.Events.CallEnded, payload);

        // Record completed or cancelled call log in DM channel
        _ = RecordCallLogAsync(term.CallerId, term.CalleeId, term.WasConnected, term.IsVideo, term.DurationSeconds);
    }

    /// <summary>
    /// Forwards WebRTC ICE candidate packets to the verified peer.
    /// </summary>
    public async Task SendIceCandidate(Guid targetUserId, string candidate)
    {
        if (!Guid.TryParse(Context.UserIdentifier, out var senderId))
        {
            throw new HubException("User is not authenticated.");
        }

        // Verify active call pairing before forwarding candidate
        var partnerId = await _callSignalingManager.GetCallPartnerAsync(senderId);
        if (partnerId != targetUserId)
        {
            _logger.LogWarning("Rejected ICE candidate from {SenderId} to {TargetUserId}: not an active call pair", senderId, targetUserId);
            return;
        }

        var payload = new IceCandidatePayload(senderId, targetUserId, candidate);

        await Clients.User(targetUserId.ToString()).SendAsync(SignalRConstants.Events.ReceiveIceCandidate, payload);
    }

    /// <summary>
    /// Persists a system call message into the DM channel between caller and callee
    /// and broadcasts the message via SignalR to both participants.
    /// </summary>
    private async Task RecordCallLogAsync(
        Guid callerId,
        Guid calleeId,
        bool wasConnected,
        bool isVideo,
        long durationSeconds)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

            // Find direct message channel between the two participants
            var dmChannel = await db.Channels
                .Include(c => c.Members)
                .Where(c => c.Type == ChannelType.DirectMessage)
                .FirstOrDefaultAsync(c => c.Members.Any(m => m.UserId == callerId) &&
                                          c.Members.Any(m => m.UserId == calleeId));

            if (dmChannel == null)
            {
                return;
            }

            // Format human-readable call log text
            string content;
            var callType = isVideo ? "Video Call" : "Voice Call";

            if (!wasConnected)
            {
                content = $"[{callType} — Missed Call]";
            }
            else
            {
                var duration = TimeSpan.FromSeconds(durationSeconds);
                var durationFormatted = duration.TotalHours >= 1
                    ? $"{(int)duration.TotalHours}h {duration.Minutes}m {duration.Seconds}s"
                    : duration.TotalMinutes >= 1
                        ? $"{duration.Minutes}m {duration.Seconds}s"
                        : $"{duration.Seconds}s";

                content = $"[{callType} — {durationFormatted}]";
            }

            var message = new Message
            {
                ChannelId = dmChannel.Id,
                SenderId = callerId,
                Content = content,
                CreatedAt = DateTime.UtcNow
            };

            db.Messages.Add(message);

            dmChannel.LastMessageAt = message.CreatedAt;
            dmChannel.LastMessageContent = content;
            dmChannel.LastMessageSenderId = callerId;

            await db.SaveChangesAsync();

            // Load sender user info for realtime broadcast
            var senderUser = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == callerId);

            var messageDto = new NomNa.Application.Features.Messages.DTOs.MessageDto(
                message.Id,
                dmChannel.Id,
                callerId,
                senderUser?.DisplayName ?? "User",
                senderUser?.UserName ?? "user",
                senderUser?.AvatarUrl,
                content,
                null,
                false,
                message.CreatedAt,
                new List<NomNa.Application.Features.Messages.DTOs.ReactionGroupDto>(),
                new List<NomNa.Application.Features.Messages.DTOs.MessageAttachmentDto>()
            );

            // Multicast to channel group so both clients' message lists update instantaneously
            await Clients.Group(dmChannel.Id.ToString()).SendAsync(SignalRConstants.Events.ReceiveMessage, messageDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to persist call history log between {CallerId} and {CalleeId}", callerId, calleeId);
        }
    }
}
