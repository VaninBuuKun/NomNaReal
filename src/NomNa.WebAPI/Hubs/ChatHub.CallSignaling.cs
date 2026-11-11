using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Domain.Enums;
using NomNa.Shared.Constants;
using NomNa.Shared.Models;

namespace NomNa.WebAPI.Hubs;

/// <summary>
/// Partial class handling WebRTC 1v1 call signaling RPC endpoints.
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
        if (_activeCalls.TryGetValue(callerId, out _))
        {
            var busyPayload = new CallRejectedPayload(targetUserId, "You are already in an active call.");
            await Clients.Caller.SendAsync(SignalRConstants.Events.CallRejected, busyPayload);
            return;
        }

        // Verify callee is not busy in another call
        if (_activeCalls.TryGetValue(targetUserId, out _))
        {
            var busyPayload = new CallRejectedPayload(targetUserId, "User is currently busy in another call.");
            await Clients.Caller.SendAsync(SignalRConstants.Events.UserBusy, busyPayload);
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

        // Record active call intent between caller and callee
        _activeCalls[callerId] = targetUserId;
        _activeCalls[targetUserId] = callerId;

        var payload = new CallOfferPayload(callerId, callerName, callerAvatar, targetUserId, offerSdp, isVideoCall);

        _logger.LogInformation("User {CallerId} initiated call to {TargetUserId} (Video: {IsVideo})", callerId, targetUserId, isVideoCall);

        await Clients.User(targetUserId.ToString()).SendAsync(SignalRConstants.Events.CallIncoming, payload);
    }

    /// <summary>
    /// Accepts an incoming call and relays the SDP answer back to the caller.
    /// </summary>
    public async Task AcceptCall(Guid callerId, string answerSdp)
    {
        if (!Guid.TryParse(Context.UserIdentifier, out var responderId))
        {
            throw new HubException("User is not authenticated.");
        }

        // Verify that callerId has indeed initiated a call to responderId
        if (!_activeCalls.TryGetValue(callerId, out var pendingTarget) || pendingTarget != responderId)
        {
            throw new HubException("No pending call found from this user.");
        }

        _activeCalls[callerId] = responderId;
        _activeCalls[responderId] = callerId;

        var payload = new CallAnswerPayload(responderId, callerId, answerSdp);

        _logger.LogInformation("User {ResponderId} accepted call from {CallerId}", responderId, callerId);

        await Clients.User(callerId.ToString()).SendAsync(SignalRConstants.Events.CallAccepted, payload);
    }

    /// <summary>
    /// Rejects an incoming call request and cleans up call pairing state.
    /// </summary>
    public async Task RejectCall(Guid callerId, string? reason = null)
    {
        if (!Guid.TryParse(Context.UserIdentifier, out var responderId))
        {
            throw new HubException("User is not authenticated.");
        }

        RemoveCallPair(callerId, responderId);

        var payload = new CallRejectedPayload(responderId, reason);

        _logger.LogInformation("User {ResponderId} rejected call from {CallerId} (Reason: {Reason})", responderId, callerId, reason);

        await Clients.User(callerId.ToString()).SendAsync(SignalRConstants.Events.CallRejected, payload);
    }

    /// <summary>
    /// Ends an ongoing active call session and dispatches CallEnded to peer.
    /// </summary>
    public async Task EndCall(Guid peerUserId)
    {
        if (!Guid.TryParse(Context.UserIdentifier, out var senderId))
        {
            throw new HubException("User is not authenticated.");
        }

        // Verify active call pairing before ending
        if (!_activeCalls.TryGetValue(senderId, out var partnerId) || partnerId != peerUserId)
        {
            return;
        }

        RemoveCallPair(senderId, peerUserId);

        var payload = new CallEndedPayload(senderId);

        _logger.LogInformation("User {SenderId} ended call with {PeerUserId}", senderId, peerUserId);

        await Clients.User(peerUserId.ToString()).SendAsync(SignalRConstants.Events.CallEnded, payload);
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
        if (!_activeCalls.TryGetValue(senderId, out var partnerId) || partnerId != targetUserId)
        {
            _logger.LogWarning("Rejected ICE candidate from {SenderId} to {TargetUserId}: not an active call pair", senderId, targetUserId);
            return;
        }

        var payload = new IceCandidatePayload(senderId, targetUserId, candidate);

        await Clients.User(targetUserId.ToString()).SendAsync(SignalRConstants.Events.ReceiveIceCandidate, payload);
    }

    /// <summary>
    /// Unbinds active call pairing (a <-> b) only when the mapping strictly matches both directions.
    /// </summary>
    private static void RemoveCallPair(Guid a, Guid b)
    {
        if (_activeCalls.TryGetValue(a, out var aPartner) && aPartner == b)
        {
            _activeCalls.TryRemove(a, out _);
        }

        if (_activeCalls.TryGetValue(b, out var bPartner) && bPartner == a)
        {
            _activeCalls.TryRemove(b, out _);
        }
    }
}
