using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Helpers;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Friends.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Friends.Queries.GetFriendsSummary;

public class GetFriendsSummaryQueryHandler : IRequestHandler<GetFriendsSummaryQuery, Result<FriendsSummaryDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IUserPresenceTracker _presenceTracker;

    public GetFriendsSummaryQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IUserPresenceTracker presenceTracker)
    {
        _context = context;
        _currentUserService = currentUserService;
        _presenceTracker = presenceTracker;
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

        var targetUserIds = friendships
            .Select(f => f.RequesterId == uid ? f.AddresseeId : f.RequesterId)
            .Distinct()
            .ToList();

        var onlinePresenceMap = await _presenceTracker.AreUsersOnlineAsync(targetUserIds);

        var friends = new List<FriendDto>();
        var pendingIncoming = new List<FriendDto>();
        var pendingOutgoing = new List<FriendDto>();
        var blocked = new List<FriendDto>();

        foreach (var f in friendships)
        {
            if (f.Status == FriendshipStatus.Accepted)
            {
                var target = f.RequesterId == uid ? f.Addressee : f.Requester;
                var resolvedStatus = UserPresenceResolver.Resolve(onlinePresenceMap.GetValueOrDefault(target.Id), target.StatusPreference);
                friends.Add(new FriendDto(
                    f.Id,
                    target.Id,
                    target.DisplayName,
                    target.UserName ?? string.Empty,
                    target.AvatarUrl,
                    resolvedStatus,
                    f.Status,
                    f.CreatedAt
                ));
            }
            else if (f.Status == FriendshipStatus.Pending)
            {
                if (f.AddresseeId == uid)
                {
                    // Incoming request
                    var resolvedStatus = UserPresenceResolver.Resolve(onlinePresenceMap.GetValueOrDefault(f.Requester.Id), f.Requester.StatusPreference);
                    pendingIncoming.Add(new FriendDto(
                        f.Id,
                        f.Requester.Id,
                        f.Requester.DisplayName,
                        f.Requester.UserName ?? string.Empty,
                        f.Requester.AvatarUrl,
                        resolvedStatus,
                        f.Status,
                        f.CreatedAt
                    ));
                }
                else
                {
                    // Outgoing request
                    var resolvedStatus = UserPresenceResolver.Resolve(onlinePresenceMap.GetValueOrDefault(f.Addressee.Id), f.Addressee.StatusPreference);
                    pendingOutgoing.Add(new FriendDto(
                        f.Id,
                        f.Addressee.Id,
                        f.Addressee.DisplayName,
                        f.Addressee.UserName ?? string.Empty,
                        f.Addressee.AvatarUrl,
                        resolvedStatus,
                        f.Status,
                        f.CreatedAt
                    ));
                }
            }
            else if (f.Status == FriendshipStatus.Blocked)
            {
                if (f.RequesterId == uid)
                {
                    var resolvedStatus = UserPresenceResolver.Resolve(onlinePresenceMap.GetValueOrDefault(f.Addressee.Id), f.Addressee.StatusPreference);
                    blocked.Add(new FriendDto(
                        f.Id,
                        f.Addressee.Id,
                        f.Addressee.DisplayName,
                        f.Addressee.UserName ?? string.Empty,
                        f.Addressee.AvatarUrl,
                        resolvedStatus,
                        f.Status,
                        f.CreatedAt
                    ));
                }
            }
        }

        return new FriendsSummaryDto(friends, pendingIncoming, pendingOutgoing, blocked);
    }
}
