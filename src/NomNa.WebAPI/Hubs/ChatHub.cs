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
/// SignalR ChatHub: Đóng vai trò là Realtime Gateway/Endpoint cho các tính năng Chat, WebRTC và Presence.
/// [Authorize]: Yêu cầu tất cả kết nối WebSocket/Transport phải được xác thực (JWT Bearer Token trong Query String/Header).
/// Hub là Transient (được khởi tạo và tiêu hủy theo mỗi Invocation/RPC call từ client).
/// Được phân chia thành các partial classes:
/// - ChatHub.cs: Constructor, DI dependencies, Connection & Presence Lifecycle.
/// - ChatHub.Channels.cs: Join/Leave group, Typing indicator.
/// - ChatHub.Messages.cs: Gửi, sửa, xóa tin nhắn và reactions.
/// - ChatHub.CallSignaling.cs: WebRTC 1v1 Audio/Video Call Signaling.
/// </summary>
[Authorize]
public partial class ChatHub : Hub
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