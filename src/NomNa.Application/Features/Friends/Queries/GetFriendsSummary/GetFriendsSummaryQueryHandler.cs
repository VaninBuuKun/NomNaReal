using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Friends.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Friends.Queries.GetFriendsSummary;

public class GetFriendsSummaryQueryHandler : IRequestHandler<GetFriendsSummaryQuery, Result<FriendsSummaryDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetFriendsSummaryQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<FriendsSummaryDto>> Handle(GetFriendsSummaryQuery request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        if (!currentUserId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var uid = currentUserId.Value;

        var friendships = await _context.Friendships
            .AsNoTracking()
            .Include(f => f.Requester)
            .Include(f => f.Addressee)
            .Where(f => f.RequesterId == uid || f.AddresseeId == uid)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync(cancellationToken);

        var friends = new List<FriendDto>();
        var pendingIncoming = new List<FriendDto>();
        var pendingOutgoing = new List<FriendDto>();
        var blocked = new List<FriendDto>();

        foreach (var f in friendships)
        {
            if (f.Status == FriendshipStatus.Accepted)
            {
                var target = f.RequesterId == uid ? f.Addressee : f.Requester;
                friends.Add(new FriendDto(
                    f.Id,
                    target.Id,
                    target.DisplayName,
                    target.UserName ?? string.Empty,
                    target.AvatarUrl,
                    target.Status,
                    f.Status,
                    f.CreatedAt
                ));
            }
            else if (f.Status == FriendshipStatus.Pending)
            {
                if (f.AddresseeId == uid)
                {
                    // Incoming request
                    pendingIncoming.Add(new FriendDto(
                        f.Id,
                        f.Requester.Id,
                        f.Requester.DisplayName,
                        f.Requester.UserName ?? string.Empty,
                        f.Requester.AvatarUrl,
                        f.Requester.Status,
                        f.Status,
                        f.CreatedAt
                    ));
                }
                else
                {
                    // Outgoing request
                    pendingOutgoing.Add(new FriendDto(
                        f.Id,
                        f.Addressee.Id,
                        f.Addressee.DisplayName,
                        f.Addressee.UserName ?? string.Empty,
                        f.Addressee.AvatarUrl,
                        f.Addressee.Status,
                        f.Status,
                        f.CreatedAt
                    ));
                }
            }
            else if (f.Status == FriendshipStatus.Blocked)
            {
                if (f.RequesterId == uid)
                {
                    blocked.Add(new FriendDto(
                        f.Id,
                        f.Addressee.Id,
                        f.Addressee.DisplayName,
                        f.Addressee.UserName ?? string.Empty,
                        f.Addressee.AvatarUrl,
                        f.Addressee.Status,
                        f.Status,
                        f.CreatedAt
                    ));
                }
            }
        }

        return new FriendsSummaryDto(friends, pendingIncoming, pendingOutgoing, blocked);
    }
}
