using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Friends.DTOs;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Friends.Commands.SendFriendRequest;

public class SendFriendRequestCommandHandler : IRequestHandler<SendFriendRequestCommand, Result<FriendDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public SendFriendRequestCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<FriendDto>> Handle(SendFriendRequestCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        if (!currentUserId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var uid = currentUserId.Value;
        var cleanInput = request.UsernameOrEmail.Trim().TrimStart('@');
        var lowerInput = cleanInput.ToLower();

        var targetUser = await _context.Users
            .FirstOrDefaultAsync(u => u.UserName!.ToLower() == lowerInput || (u.Email != null && u.Email.ToLower() == lowerInput), cancellationToken);

        if (targetUser == null)
            return Error.NotFound("User.NotFound", $"Không tìm thấy người dùng \"{cleanInput}\".");

        if (targetUser.Id == uid)
            return Error.Validation("Friendship.Self", "Bạn không thể gửi lời mời kết bạn cho chính mình.");

        var existingFriendship = await _context.Friendships
            .FirstOrDefaultAsync(f => (f.RequesterId == uid && f.AddresseeId == targetUser.Id) ||
                                      (f.RequesterId == targetUser.Id && f.AddresseeId == uid), cancellationToken);

        if (existingFriendship != null)
        {
            if (existingFriendship.Status == FriendshipStatus.Accepted)
                return Error.Conflict("Friendship.AlreadyFriends", "Hai bạn đã là bạn bè của nhau rồi.");

            if (existingFriendship.Status == FriendshipStatus.Blocked)
                return Error.Conflict("Friendship.Blocked", "Không thể gửi lời mời kết bạn.");

            if (existingFriendship.Status == FriendshipStatus.Pending)
            {
                if (existingFriendship.RequesterId == targetUser.Id)
                {
                    // The other user already sent a request to us -> auto accept!
                    existingFriendship.Status = FriendshipStatus.Accepted;
                    existingFriendship.UpdatedAt = DateTime.UtcNow;

                    await _context.SaveChangesAsync(cancellationToken);

                    return new FriendDto(
                        existingFriendship.Id,
                        targetUser.Id,
                        targetUser.DisplayName,
                        targetUser.UserName ?? string.Empty,
                        targetUser.AvatarUrl,
                        targetUser.Status,
                        FriendshipStatus.Accepted,
                        existingFriendship.CreatedAt
                    );
                }

                return Error.Conflict("Friendship.AlreadyPending", "Bạn đã gửi lời mời kết bạn cho người này rồi.");
            }
        }

        var friendship = new Friendship
        {
            RequesterId = uid,
            AddresseeId = targetUser.Id,
            Status = FriendshipStatus.Pending
        };

        _context.Friendships.Add(friendship);

        // Add Notification for Addressee
        var currentUser = await _context.Users.FindAsync(new object[] { uid }, cancellationToken);
        var notif = new Notification
        {
            UserId = targetUser.Id,
            ActorId = uid,
            Type = NotificationType.FriendRequest,
            Title = $"{currentUser?.DisplayName ?? "Ai đó"} đã gửi cho bạn một lời mời kết bạn",
            Content = $"@{currentUser?.UserName ?? "user"} muốn kết nối với bạn trên NomNa."
        };
        _context.Notifications.Add(notif);

        await _context.SaveChangesAsync(cancellationToken);

        return new FriendDto(
            friendship.Id,
            targetUser.Id,
            targetUser.DisplayName,
            targetUser.UserName ?? string.Empty,
            targetUser.AvatarUrl,
            targetUser.Status,
            FriendshipStatus.Pending,
            friendship.CreatedAt
        );
    }
}
