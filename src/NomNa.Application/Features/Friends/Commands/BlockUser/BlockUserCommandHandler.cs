using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Friends.Commands.BlockUser;

public class BlockUserCommandHandler : IRequestHandler<BlockUserCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public BlockUserCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result> Handle(BlockUserCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        if (!currentUserId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var uid = currentUserId.Value;
        if (request.TargetUserId == uid)
            return Error.Validation("Friendship.Self", "Bạn không thể chặn chính mình.");

        var existing = await _context.Friendships
            .FirstOrDefaultAsync(f => (f.RequesterId == uid && f.AddresseeId == request.TargetUserId) ||
                                      (f.RequesterId == request.TargetUserId && f.AddresseeId == uid), cancellationToken);

        if (existing != null)
        {
            existing.RequesterId = uid;
            existing.AddresseeId = request.TargetUserId;
            existing.Status = FriendshipStatus.Blocked;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            _context.Friendships.Add(new Friendship
            {
                RequesterId = uid,
                AddresseeId = request.TargetUserId,
                Status = FriendshipStatus.Blocked
            });
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
