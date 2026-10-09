using MediatR;
using Microsoft.EntityFrameworkCore;
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

        var isMember = await _context.ServerMembers
            .AnyAsync(m => m.ServerId == request.ServerId && m.UserId == currentUserId.Value, cancellationToken);

        if (!isMember)
            return Error.Forbidden("Server.Forbidden", "You are not a member of this server.");

        var onlineUsers = await _presenceTracker.GetOnlineUsersAsync();

        // Find DM channels where current user is a participant
        var dmChannels = await _context.Channels
            .AsNoTracking()
            .Where(c => c.ServerId == request.ServerId && c.Type == ChannelType.DirectMessage &&
                        c.Members.Any(m => m.UserId == currentUserId.Value))
            .Include(c => c.Members)
                .ThenInclude(m => m.User)
            .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
            .ToListAsync(cancellationToken);

        var result = new List<DirectMessageChannelDto>();

        foreach (var ch in dmChannels)
        {
            var otherMember = ch.Members.FirstOrDefault(m => m.UserId != currentUserId.Value)?.User
                              ?? ch.Members.FirstOrDefault()?.User;

            if (otherMember == null) continue;

            var status = onlineUsers.Contains(otherMember.Id) ? "online" : otherMember.Status.ToString().ToLower();

            result.Add(new DirectMessageChannelDto(
                ch.Id,
                ch.ServerId,
                otherMember.Id,
                otherMember.DisplayName,
                otherMember.UserName ?? string.Empty,
                otherMember.AvatarUrl,
                otherMember.Email,
                status,
                ch.LastMessageContent,
                ch.LastMessageAt ?? ch.CreatedAt,
                0
            ));
        }

        return result;
    }
}
