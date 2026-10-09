using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Friends.Commands.UnblockUser;

public class UnblockUserCommandHandler : IRequestHandler<UnblockUserCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public UnblockUserCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result> Handle(UnblockUserCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        if (!currentUserId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var uid = currentUserId.Value;

        var existing = await _context.Friendships
            .FirstOrDefaultAsync(f => f.RequesterId == uid &&
                                      f.AddresseeId == request.TargetUserId &&
                                      f.Status == FriendshipStatus.Blocked, cancellationToken);

        if (existing == null)
            return Error.NotFound("Friendship.NotFound", "Không tìm thấy trạng thái chặn người dùng này.");

        _context.Friendships.Remove(existing);
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
