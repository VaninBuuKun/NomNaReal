using System.Collections.Concurrent;
using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Exceptions;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Features.Messages.Commands.SendMessage;
using NomNa.Application.Features.Messages.DTOs;
using NomNa.Domain.Enums;
using NomNa.Shared.Constants;
using NomNa.Shared.Models;

namespace NomNa.WebAPI.Hubs;

/// <summary>
/// SignalR ChatHub: Đóng vai trò là Realtime Gateway/Endpoint cho các tính năng Chat.
/// [Authorize]: Yêu cầu tất cả kết nối WebSocket/Transport phải được xác thực (JWT Bearer Token trong Query String/Header).
/// Hub là Transient (được khởi tạo và tiêu hủy theo mỗi Invocation/RPC call từ client).
/// </summary>
[Authorize]
public class ChatHub : Hub
{
    private readonly ISender _mediator;
    private readonly ILogger<ChatHub> _logger;
    private readonly IUserPresenceTracker _presenceTracker; // Singleton Service theo dõi danh sách connection/online status
    private readonly IServiceScopeFactory _scopeFactory;   // Dùng để tạo DI Scope ngắn hạn truy cập DbContext (Scoped Service) trong Hub lifecycle

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

    #region Group Management (Channel & Thread Subscriptions)

    /// <summary>
    /// Tham gia vào một Channel Group để nhận tin nhắn Realtime của Channel đó.
    /// Khái niệm Groups trong SignalR cho phép multicast tin nhắn tới một tập hợp các ConnectionId cụ thể.
    /// </summary>
    public async Task JoinChannel(Guid channelId)
    {
        // 1. Kiểm tra Principal Claim để xác định UserId từ JWT Token
        if (!Guid.TryParse(Context.UserIdentifier, out var userId))
        {
            throw new HubException("User is not authenticated.");
        }

        // 2. Vì Hub là Transient và ChatHub có thể gọi DbContext, ta tự tạo Service Scope 
        // để query DB kiểm tra phân quyền (Authorization Check) trước khi cho phép subscribe Group.
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

        // 3. Đăng ký ConnectionId hiện tại vào SignalR Group đại diện cho Channel (Mapping Connection <-> Group)
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
    /// Rời khỏi SignalR Group đại diện cho Channel khi Client chuyển tab hoặc đóng channel.
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

    #endregion

    #region Messaging RPC Endpoints (Server-Side Invocations)

    /// <summary>
    /// Endpoint Client gọi qua WebSocket RPC để gửi tin nhắn chính.
    /// Xử lý theo mô hình Command Pattern qua MediatR, sau đó Broadcast tới Group Channel.
    /// </summary>
    public async Task<MessageDto> SendMessage(Guid channelId, string? content, Guid? replyToMessageId = null, List<AttachmentInputDto>? attachments = null)
    {
        try
        {
            // Execute Business Logic qua Application Layer (CQRS Command)
            var command = new SendMessageCommand(channelId, content, replyToMessageId, attachments);
            var result = await _mediator.Send(command);

            if (!result.IsSuccess)
            {
                // Bắn HubException về cho Client catch trong SignalR Client SDK
                throw new HubException(result.Error.Message);
            }

            var message = result.Value!;

            // Broadcast (Multicast) tin nhắn vừa tạo cho TẤT CẢ các Client đang ở trong Channel Group
            var groupName = channelId.ToString();
            await Clients.Group(groupName).SendAsync(SignalRConstants.Events.ReceiveMessage, message);

            // Cho kênh Direct Message: Đồng thời bắn thẳng tới UserId của người nhận (dù họ chưa mở tab chat đó)
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
                var channel = await db.Channels
                    .AsNoTracking()
                    .Select(c => new { c.Id, c.Type })
                    .FirstOrDefaultAsync(c => c.Id == channelId);

                if (channel != null && channel.Type == ChannelType.DirectMessage)
                {
                    var recipientUserIds = await db.ChannelMembers
                        .AsNoTracking()
                        .Where(cm => cm.ChannelId == channelId && cm.UserId != message.SenderId)
                        .Select(cm => cm.UserId.ToString())
                        .ToListAsync();

                    if (recipientUserIds.Count > 0)
                    {
                        await Clients.Users(recipientUserIds).SendAsync(SignalRConstants.Events.ReceiveMessage, message);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to dispatch direct message to user clients for channel {ChannelId}", channelId);
            }

            // Trả về cho caller (client vừa gọi SendMessage) kết quả để UI client nhận Promise/Task result
            return message;
        }
        catch (ValidationException ex)
        {
            var msg = ex.Errors.Values.SelectMany(x => x).FirstOrDefault() ?? ex.Message;
            throw new HubException(msg);
        }
    }

    /// <summary>
    /// Chỉnh sửa nội dung tin nhắn và bắn Event MessageEdited tới Channel Group.
    /// </summary>
    public async Task<MessageEditedDto> EditMessage(Guid messageId, string content)
    {
        var command = new Application.Features.Messages.Commands.EditMessage.EditMessageCommand(messageId, content);
        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
        {
            throw new HubException(result.Error.Message);
        }

        var message = result.Value!;
        var channelGroup = message.ChannelId.ToString();
        await Clients.Group(channelGroup).SendAsync(SignalRConstants.Events.MessageEdited, message);

        return message;
    }

    /// <summary>
    /// Xóa tin nhắn và thông báo Realtime để Client loại bỏ Message khỏi DOM/State UI.
    /// </summary>
    public async Task<DeletedMessageDto> DeleteMessage(Guid messageId)
    {
        var command = new Application.Features.Messages.Commands.DeleteMessage.DeleteMessageCommand(messageId);
        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
        {
            throw new HubException(result.Error.Message);
        }

        var deleted = result.Value!;
        var channelGroup = deleted.ChannelId.ToString();
        await Clients.Group(channelGroup).SendAsync(SignalRConstants.Events.MessageDeleted, deleted);

        return deleted;
    }

    /// <summary>
    /// Thêm/Gỡ Reaction (Cảm xúc emoji) trên tin nhắn Realtime.
    /// </summary>
    public async Task<ReactionToggledDto> ToggleReaction(Guid messageId, string emoji)
    {
        var command = new Application.Features.Messages.Commands.ToggleReaction.ToggleReactionCommand(messageId, emoji);
        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
        {
            throw new HubException(result.Error.Message);
        }

        var update = result.Value!;
        var channelGroup = update.ChannelId.ToString();
        await Clients.Group(channelGroup).SendAsync(SignalRConstants.Events.ReceiveReactionUpdated, update);

        return update;
    }

    #endregion

    #region Ephemeral Realtime Events (Typing Indicators)

    /// <summary>
    /// Trạng thái gõ phím (Typing Indicator) - Đây là dạng Ephemeral Data (dữ liệu tạm thời không lưu DB).
    /// Dùng `Clients.OthersInGroup` để gửi sự kiện cho TẤT CẢ mọi người trong channel NGOẠI TRỪ người đang gõ.
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
    /// Thông báo dừng gõ phím để ẩn indicator trên UI các client khác.
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

    #endregion

    #region WebRTC 1v1 Signaling RPC Endpoints

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

        _activeCalls.TryRemove(callerId, out _);
        _activeCalls.TryRemove(responderId, out _);

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

        _activeCalls.TryRemove(senderId, out _);
        _activeCalls.TryRemove(peerUserId, out _);

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

    #endregion

    #region Presence & Connection Lifecycle (OnConnected / OnDisconnected)

    /// <summary>
    /// Lấy danh sách các UserId đang Online từ In-Memory/Redis Tracker.
    /// </summary>
    public async Task<IReadOnlyCollection<string>> GetOnlineUsers()
    {
        var onlineUsers = await _presenceTracker.GetOnlineUsersAsync();
        return onlineUsers.Select(u => u.ToString()).ToList();
    }

    /// <summary>
    /// Event Handler kích hoạt khi một WebSocket/Transport Connection thiết lập thành công.
    /// Quản lý Multi-device Connection (Một User có thể mở nhiều Tab/Thiết bị khác nhau).
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        var userIdStr = Context.UserIdentifier;
        _logger.LogInformation("Client connected: {ConnectionId} (User: {UserId})", Context.ConnectionId, userIdStr);

        if (Guid.TryParse(userIdStr, out var userId))
        {
            // _presenceTracker trả về true NẾU ĐÂY LÀ CONNECTION ĐẦU TIÊN của User (chuyển trạng thái từ Offline -> Online)
            var becameOnline = await _presenceTracker.UserConnectedAsync(userId, Context.ConnectionId);
            if (becameOnline)
            {
                try
                {
                    // Cập nhật trạng thái User thành Online trong DB
                    using var scope = _scopeFactory.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
                    var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
                    if (user != null)
                    {
                        user.Status = UserStatus.Online;
                        await db.SaveChangesAsync(default);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to update user status to Online in database for {UserId}", userId);
                }

                // Broadcast toàn hệ thống (Clients.All) báo rằng User này vừa mới Online
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
    /// Event Handler kích hoạt khi kết nối WebSocket bị ngắt (Client đóng tab, mất mạng, timeout,...).
    /// </summary>
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userIdStr = Context.UserIdentifier;
        _logger.LogInformation("Client disconnected: {ConnectionId} (User: {UserId})", Context.ConnectionId, userIdStr);

        if (Guid.TryParse(userIdStr, out var userId))
        {
            // Nếu User đang trong cuộc gọi dở mà bị ngắt kết nối (tắt tab, mất mạng), tự động báo CallEnded cho đối phương
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

            // _presenceTracker trả về true NẾU TẤT CẢ CONNECTION CỦA USER ĐÃ ĐÓNG (người dùng thực sự Offline hẳn)
            var becameOffline = await _presenceTracker.UserDisconnectedAsync(userId, Context.ConnectionId);
            if (becameOffline)
            {
                try
                {
                    // Cập nhật trạng thái User thành Offline trong DB
                    using var scope = _scopeFactory.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
                    var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
                    if (user != null)
                    {
                        user.Status = UserStatus.Offline;
                        await db.SaveChangesAsync(default);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to update user status to Offline in database for {UserId}", userId);
                }

                // Broadcast cho toàn hệ thống biết User đã Offline
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