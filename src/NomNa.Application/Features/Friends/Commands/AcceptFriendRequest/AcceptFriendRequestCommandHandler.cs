using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Friends.DTOs;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Friends.Commands.AcceptFriendRequest;

public class AcceptFriendRequestCommandHandler : IRequestHandler<AcceptFriendRequestCommand, Result<FriendDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public AcceptFriendRequestCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<FriendDto>> Handle(AcceptFriendRequestCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        if (!currentUserId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var uid = currentUserId.Value;

        var friendship = await _context.Friendships
            .Include(f => f.Requester)
            .Include(f => f.Addressee)
            .FirstOrDefaultAsync(f => f.Id == request.FriendshipId, cancellationToken);

        if (friendship == null)
            return Error.NotFound("Friendship.NotFound", "Không tìm thấy lời mời kết bạn này.");

        if (friendship.AddresseeId != uid)
            return Error.Forbidden("Friendship.Forbidden", "Bạn không có quyền chấp nhận lời mời kết bạn này.");

        if (friendship.Status == FriendshipStatus.Accepted)
            return Error.Conflict("Friendship.AlreadyAccepted", "Lời mời kết bạn đã được chấp nhận trước đó.");

        friendship.Status = FriendshipStatus.Accepted;
        friendship.UpdatedAt = DateTime.UtcNow;

        // Create Notification for the Requester
        var notif = new Notification
        {
            UserId = friendship.RequesterId,
            ActorId = uid,
            Type = NotificationType.FriendAccepted,
            Title = $"{friendship.Addressee.DisplayName} đã chấp nhận lời mời kết bạn của bạn",
            Content = $"Giờ đây bạn và @{friendship.Addressee.UserName} có thể trò chuyện trực tiếp trên NomNa!"
        };
        _context.Notifications.Add(notif);

        await _context.SaveChangesAsync(cancellationToken);

        return new FriendDto(
            friendship.Id,
            friendship.Requester.Id,
            friendship.Requester.DisplayName,
            friendship.Requester.UserName ?? string.Empty,
            friendship.Requester.AvatarUrl,
            friendship.Requester.Status,
            FriendshipStatus.Accepted,
            friendship.CreatedAt
        );
    }
}
