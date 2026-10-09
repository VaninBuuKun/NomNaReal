using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Exceptions;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Features.Messages.Commands.ReplyToMessage;
using NomNa.Application.Features.Messages.Commands.SendMessage;
using NomNa.Application.Features.Messages.DTOs;
using NomNa.Domain.Enums;
using NomNa.Shared.Constants;

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

            // Phân quyền riêng cho Channel Private / Direct Message vs Channel Public trong Workspace
            if (channel.IsPrivate || channel.Type == ChannelType.DirectMessage)
            {
                var isMember = await db.ChannelMembers
                    .AnyAsync(cm => cm.ChannelId == channel.Id && cm.UserId == userId);
                if (!isMember && channel.CreatedById != userId)
                {
                    throw new HubException("Access denied to this private channel.");
                }
            }
            else
            {
                var isMember = await db.ServerMembers
                    .AnyAsync(wm => wm.ServerId == channel.ServerId && wm.UserId == userId);
                if (!isMember)
                {
                    throw new HubException("Access denied to this server.");
                }
            }
        }

        // 3. Đăng ký ConnectionId hiện tại vào SignalR Group đại diện cho Channel (Mapping Connection <-> Group)
        var groupName = channelId.ToString();
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        _logger.LogInformation("User {UserId} joined SignalR group {ChannelId}", Context.UserIdentifier, channelId);
    }

    /// <summary>
    /// Rời khỏi SignalR Group đại diện cho Channel khi Client chuyển tab hoặc đóng channel.
    /// </summary>
    public async Task LeaveChannel(Guid channelId)
    {
        var groupName = channelId.ToString();
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        _logger.LogInformation("User {UserId} left SignalR group {ChannelId}", Context.UserIdentifier, channelId);
    }

    /// <summary>
    /// Subcribe vào Group riêng của một Thread (Sub-conversation) để nhận phản hồi con.
    /// </summary>
    public async Task JoinThread(Guid parentMessageId)
    {
        var groupName = $"thread_{parentMessageId}";
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        _logger.LogInformation("User {UserId} joined SignalR thread {ParentMessageId}", Context.UserIdentifier, parentMessageId);
    }

    /// <summary>
    /// Unsubscribe khỏi Thread Group.
    /// </summary>
    public async Task LeaveThread(Guid parentMessageId)
    {
        var groupName = $"thread_{parentMessageId}";
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        _logger.LogInformation("User {UserId} left SignalR thread {ParentMessageId}", Context.UserIdentifier, parentMessageId);
    }

    #endregion

    #region Messaging RPC Endpoints (Server-Side Invocations)

    /// <summary>
    /// Endpoint Client gọi qua WebSocket RPC để gửi tin nhắn chính.
    /// Xử lý theo mô hình Command Pattern qua MediatR, sau đó Broadcast tới Group Channel.
    /// </summary>
    public async Task<MessageDto> SendMessage(Guid channelId, string? content, Guid? threadId = null, List<AttachmentInputDto>? attachments = null)
    {
        try
        {
            // Execute Business Logic qua Application Layer (CQRS Command)
            var command = new SendMessageCommand(channelId, content, threadId, attachments);
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
    /// Gửi reply trong Thread và thông báo Realtime cho cả Thread Group lẫn Main Channel Badge Count.
    /// </summary>
    public async Task<MessageDto> SendThreadReply(Guid parentMessageId, string content)
    {
        try
        {
            var command = new ReplyToMessageCommand(parentMessageId, content);
            var result = await _mediator.Send(command);

            if (!result.IsSuccess)
            {
                throw new HubException(result.Error.Message);
            }

            var reply = result.Value!;

            // 1. Broadcast tin nhắn reply mới tới những ai đang mở xem Thread đó (Thread Panel)
            var threadGroup = $"thread_{parentMessageId}";
            await Clients.Group(threadGroup).SendAsync(SignalRConstants.Events.ReceiveThreadReply, reply);

            // 2. Broadcast sự kiện cập nhật số lượng Reply (ReplyCount) tới Main Channel để hiển thị Badge ở UI ngoài
            var channelGroup = reply.ChannelId.ToString();
            await Clients.Group(channelGroup).SendAsync(SignalRConstants.Events.ThreadReplyCountUpdated, new
            {
                parentMessageId,
                channelId = reply.ChannelId,
                replyId = reply.Id,
                replyCount = reply.ReplyCount
            });

            return reply;
        }
        catch (ValidationException ex)
        {
            var msg = ex.Errors.Values.SelectMany(x => x).FirstOrDefault() ?? ex.Message;
            throw new HubException(msg);
        }
    }

    /// <summary>
    /// Chỉnh sửa nội dung tin nhắn và bắn Event MessageEdited đồng thời cho cả Channel lẫn Thread (nếu có).
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

        // Bắn sự kiện tới Thread Group nếu đây là tin nhắn thuộc thread hoặc chính là Root Message của thread
        if (message.ThreadId.HasValue)
        {
            await Clients.Group($"thread_{message.ThreadId.Value}").SendAsync(SignalRConstants.Events.MessageEdited, message);
        }
        else
            await Clients.Group($"thread_{message.Id}").SendAsync(SignalRConstants.Events.MessageEdited, message);

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

        if (deleted.ThreadId.HasValue)
        {
            await Clients.Group($"thread_{deleted.ThreadId.Value}").SendAsync(SignalRConstants.Events.MessageDeleted, deleted);
        }
        await Clients.Group($"thread_{deleted.MessageId}").SendAsync(SignalRConstants.Events.MessageDeleted, deleted);

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

        if (update.ThreadId.HasValue)
        {
            await Clients.Group($"thread_{update.ThreadId.Value}").SendAsync(SignalRConstants.Events.ReceiveReactionUpdated, update);
        }
        await Clients.Group($"thread_{update.MessageId}").SendAsync(SignalRConstants.Events.ReceiveReactionUpdated, update);

        return update;
    }

    #endregion

    #region Ephemeral Realtime Events (Typing Indicators)

    /// <summary>
    /// Trạng thái gõ phím (Typing Indicator) - Đây là dạng Ephemeral Data (dữ liệu tạm thời không lưu DB).
    /// Dùng `Clients.OthersInGroup` để gửi sự kiện cho TẤT CẢ mọi người trong channel NGOẠI TRỪ người đang gõ.
    /// </summary>
    public async Task StartTyping(Guid channelId)
    {
        var groupName = channelId.ToString();
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
    public async Task StopTyping(Guid channelId)
    {
        var groupName = channelId.ToString();
        var userId = Context.UserIdentifier;

        await Clients.OthersInGroup(groupName).SendAsync(SignalRConstants.Events.UserStoppedTyping, new
        {
            channelId,
            userId
        });
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