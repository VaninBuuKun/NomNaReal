using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Servers.Queries.GetServerMembers;

public class GetServerMembersQueryHandler : IRequestHandler<GetServerMembersQuery, Result<List<ServerMemberDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IUserPresenceTracker _presenceTracker;

    public GetServerMembersQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IUserPresenceTracker presenceTracker)
    {
        _context = context;
        _currentUserService = currentUserService;
        _presenceTracker = presenceTracker;
    }

    public async Task<Result<List<ServerMemberDto>>> Handle(GetServerMembersQuery request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        if (!currentUserId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var isMember = await _context.ServerMembers
            .AnyAsync(m => m.ServerId == request.ServerId && m.UserId == currentUserId.Value, cancellationToken);

        if (!isMember)
            return Error.Forbidden("Server.Forbidden", "You are not a member of this server.");

        var members = await _context.ServerMembers
            .AsNoTracking()
            .Where(m => m.ServerId == request.ServerId)
            .Include(m => m.User)
            .OrderBy(m => m.User.DisplayName)
            .ToListAsync(cancellationToken);

        var onlineUsers = await _presenceTracker.GetOnlineUsersAsync();

        return members.Select(m => new ServerMemberDto(
            m.Id,
            m.UserId,
            m.User.DisplayName,
            m.User.UserName ?? string.Empty,
            m.User.AvatarUrl,
            m.User.Email,
            m.Role.ToString(),
            onlineUsers.Contains(m.UserId) ? "online" : m.User.Status.ToString().ToLower()
        )).ToList();
    }
}
