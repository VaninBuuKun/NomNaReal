using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Helpers;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Channels.Queries.GetDirectMessages;

public class GetDirectMessagesQueryHandler : IRequestHandler<GetDirectMessagesQuery, Result<List<DirectMessageChannelDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IUserPresenceTracker _presenceTracker;

    public GetDirectMessagesQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IUserPresenceTracker presenceTracker)
    {
        _context = context;
        _currentUserService = currentUserService;
        _presenceTracker = presenceTracker;
    }

    public async Task<Result<List<DirectMessageChannelDto>>> Handle(GetDirectMessagesQuery request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        if (!currentUserId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        if (request.ServerId.HasValue)
        {
            var isMember = await _context.ServerMembers
                .AnyAsync(m => m.ServerId == request.ServerId.Value && m.UserId == currentUserId.Value, cancellationToken);

            if (!isMember)
                return Error.Forbidden("Server.Forbidden", "You are not a member of this server.");
        }

        // Find DM channels where current user is a participant
        var query = _context.Channels
            .AsNoTracking()
            .Where(c => c.Type == ChannelType.DirectMessage &&
                        c.Members.Any(m => m.UserId == currentUserId.Value));

        if (request.ServerId.HasValue)
        {
            query = query.Where(c => c.ServerId == request.ServerId.Value);
        }

        // PERF-03: Ultra-lean projection. Select only essential channel and participant fields.
        // No unread subqueries, no SELECT * on users, keeping query execution at single-digit milliseconds.
        var dmChannels = await query
            .Select(c => new
            {
                c.Id,
                c.ServerId,
                c.LastMessageContent,
                LastMessageTime = c.LastMessageAt ?? c.CreatedAt,
                OtherUser = c.Members
                    .Where(m => m.UserId != currentUserId.Value)
                    .Select(m => new
                    {
                        m.User.Id,
                        m.User.DisplayName,
                        UserName = m.User.UserName ?? string.Empty,
                        m.User.AvatarUrl,
                        m.User.Email,
                        m.User.StatusPreference
                    })
                    .FirstOrDefault(),
                FirstUser = c.Members
                    .Select(m => new
                    {
                        m.User.Id,
                        m.User.DisplayName,
                        UserName = m.User.UserName ?? string.Empty,
                        m.User.AvatarUrl,
                        m.User.Email,
                        m.User.StatusPreference
                    })
                    .FirstOrDefault()
            })
            .OrderByDescending(c => c.LastMessageTime)
            .ToListAsync(cancellationToken);

        var otherUserIds = dmChannels
            .Select(c => (c.OtherUser ?? c.FirstUser)?.Id)
            .Where(id => id.HasValue && id.Value != currentUserId.Value)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();

        var onlinePresenceMap = await _presenceTracker.AreUsersOnlineAsync(otherUserIds);

        var result = new List<DirectMessageChannelDto>();
        var seenUserIds = new HashSet<Guid>();

        foreach (var ch in dmChannels)
        {
            var otherMember = ch.OtherUser ?? ch.FirstUser;

            if (otherMember == null) continue;
            if (!seenUserIds.Add(otherMember.Id)) continue; // Deduplicate: keep only the most recent channel per user

            var status = UserPresenceResolver.Resolve(onlinePresenceMap.GetValueOrDefault(otherMember.Id), otherMember.StatusPreference);

            result.Add(new DirectMessageChannelDto(
                ch.Id,
                ch.ServerId,
                otherMember.Id,
                otherMember.DisplayName,
                otherMember.UserName,
                otherMember.AvatarUrl,
                otherMember.Email,
                status,
                ch.LastMessageContent,
                ch.LastMessageTime,
                0
            ));
        }

        return result;
    }
}
