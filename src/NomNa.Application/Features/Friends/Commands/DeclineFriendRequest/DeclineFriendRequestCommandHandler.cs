using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Friends.Commands.DeclineFriendRequest;

public class DeclineFriendRequestCommandHandler : IRequestHandler<DeclineFriendRequestCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public DeclineFriendRequestCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result> Handle(DeclineFriendRequestCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        if (!currentUserId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var uid = currentUserId.Value;

        var friendship = await _context.Friendships
            .FirstOrDefaultAsync(f => f.Id == request.FriendshipId, cancellationToken);

        if (friendship == null)
            return Error.NotFound("Friendship.NotFound", "Không tìm thấy lời mời kết bạn này.");

        if (friendship.AddresseeId != uid && friendship.RequesterId != uid)
            return Error.Forbidden("Friendship.Forbidden", "Bạn không có quyền thực hiện thao tác này.");

        _context.Friendships.Remove(friendship);
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
