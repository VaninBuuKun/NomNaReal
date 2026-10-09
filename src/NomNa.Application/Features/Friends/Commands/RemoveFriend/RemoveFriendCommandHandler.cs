using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Friends.Commands.RemoveFriend;

public class RemoveFriendCommandHandler : IRequestHandler<RemoveFriendCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public RemoveFriendCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result> Handle(RemoveFriendCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        if (!currentUserId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var uid = currentUserId.Value;

        var friendship = await _context.Friendships
            .FirstOrDefaultAsync(f => f.Id == request.FriendshipId, cancellationToken);

        if (friendship == null)
            return Error.NotFound("Friendship.NotFound", "Không tìm thấy quan hệ bạn bè này.");

        if (friendship.RequesterId != uid && friendship.AddresseeId != uid)
            return Error.Forbidden("Friendship.Forbidden", "Bạn không có quyền hủy kết bạn này.");

        _context.Friendships.Remove(friendship);
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
