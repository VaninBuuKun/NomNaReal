using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Shared.Constants;
using NomNa.Shared.Models;

namespace NomNa.WebAPI.Hubs;

/// <summary>
/// Partial class phụ trách toàn bộ WebRTC 1v1 Signaling RPC Endpoints.
/// </summary>
public partial class ChatHub
{
    /// <summary>
    /// Bắt đầu cuộc gọi 1-1 tới targetUserId bằng cách gửi SDP Offer qua SignalR
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

        // Kiểm tra xem đối phương có đang Online không
        var isTargetOnline = await _presenceTracker.IsUserOnlineAsync(targetUserId);
        if (!isTargetOnline)
        {
            var offlinePayload = new CallRejectedPayload(targetUserId, "Người dùng hiện không trực tuyến.");
            await Clients.Caller.SendAsync(SignalRConstants.Events.CallRejected, offlinePayload);
            return;
        }

        // Dọn dẹp bất kỳ trạng thái cuộc gọi cũ nào của caller nếu có
        if (_activeCalls.TryRemove(callerId, out var oldPartner))
        {
            _activeCalls.TryRemove(oldPartner, out _);
        }

        // Lưu intent cuộc gọi active giữa 2 user
        _activeCalls[callerId] = targetUserId;
        _activeCalls[targetUserId] = callerId;

        var callerName = Context.User?.FindFirstValue(ClaimTypes.Name) ?? "User";
        string? callerAvatar = null;

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
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

        var payload = new CallOfferPayload(callerId, callerName, callerAvatar, targetUserId, offerSdp, isVideoCall);

        _logger.LogInformation("User {CallerId} initiated call to {TargetUserId} (Video: {IsVideo})", callerId, targetUserId, isVideoCall);

        await Clients.User(targetUserId.ToString()).SendAsync(SignalRConstants.Events.CallIncoming, payload);
    }

    /// <summary>
    /// Chấp nhận cuộc gọi và gửi SDP Answer về cho người gọi
    /// </summary>
    public async Task AcceptCall(Guid callerId, string answerSdp)
    {
        if (!Guid.TryParse(Context.UserIdentifier, out var responderId))
        {
            throw new HubException("User is not authenticated.");
        }

        _activeCalls[callerId] = responderId;
        _activeCalls[responderId] = callerId;

        var payload = new CallAnswerPayload(responderId, callerId, answerSdp);

        _logger.LogInformation("User {ResponderId} accepted call from {CallerId}", responderId, callerId);

        await Clients.User(callerId.ToString()).SendAsync(SignalRConstants.Events.CallAccepted, payload);
    }

    /// <summary>
    /// Từ chối cuộc gọi
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
    /// Kết thúc cuộc gọi hiện tại
    /// </summary>
    public async Task EndCall(Guid peerUserId)
    {
        if (!Guid.TryParse(Context.UserIdentifier, out var senderId))
        {
            throw new HubException("User is not authenticated.");
        }

        RemoveCallPair(senderId, peerUserId);

        var payload = new CallEndedPayload(senderId);

        _logger.LogInformation("User {SenderId} ended call with {PeerUserId}", senderId, peerUserId);

        await Clients.User(peerUserId.ToString()).SendAsync(SignalRConstants.Events.CallEnded, payload);
    }

    /// <summary>
    /// Trao đổi ICE candidate giữa hai client
    /// </summary>
    public async Task SendIceCandidate(Guid targetUserId, string candidate)
    {
        if (!Guid.TryParse(Context.UserIdentifier, out var senderId))
        {
            throw new HubException("User is not authenticated.");
        }

        var payload = new IceCandidatePayload(senderId, targetUserId, candidate);

        await Clients.User(targetUserId.ToString()).SendAsync(SignalRConstants.Events.ReceiveIceCandidate, payload);
    }

    /// <summary>
    /// Gỡ cặp cuộc gọi (a ↔ b) nhưng CHỈ khi mapping thực sự thuộc cặp này, tránh xoá nhầm cuộc gọi khác đang diễn ra.
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
