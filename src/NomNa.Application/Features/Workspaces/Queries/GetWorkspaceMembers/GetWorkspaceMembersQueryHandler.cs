using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Workspaces.Queries.GetWorkspaceMembers;

public class GetWorkspaceMembersQueryHandler : IRequestHandler<GetWorkspaceMembersQuery, Result<List<WorkspaceMemberDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IUserPresenceTracker _presenceTracker;

    public GetWorkspaceMembersQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IUserPresenceTracker presenceTracker)
    {
        _context = context;
        _currentUserService = currentUserService;
        _presenceTracker = presenceTracker;
    }

    public async Task<Result<List<WorkspaceMemberDto>>> Handle(GetWorkspaceMembersQuery request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        if (!currentUserId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var isMember = await _context.WorkspaceMembers
            .AnyAsync(m => m.WorkspaceId == request.WorkspaceId && m.UserId == currentUserId.Value, cancellationToken);

        if (!isMember)
            return Error.Forbidden("Workspace.Forbidden", "You are not a member of this workspace.");

        var members = await _context.WorkspaceMembers
            .AsNoTracking()
            .Where(m => m.WorkspaceId == request.WorkspaceId)
            .Include(m => m.User)
            .OrderBy(m => m.User.DisplayName)
            .ToListAsync(cancellationToken);

        var onlineUsers = await _presenceTracker.GetOnlineUsersAsync();

        return members.Select(m => new WorkspaceMemberDto(
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
