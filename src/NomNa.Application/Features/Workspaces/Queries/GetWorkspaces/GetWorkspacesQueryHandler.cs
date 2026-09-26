using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Workspaces.DTOs;

namespace NomNa.Application.Features.Workspaces.Queries.GetWorkspaces;

public class GetWorkspacesQueryHandler : IRequestHandler<GetWorkspacesQuery, Result<List<WorkspaceDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetWorkspacesQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<List<WorkspaceDto>>> Handle(GetWorkspacesQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        return await _context.WorkspaceMembers
            .AsNoTracking()
            .Where(wm => wm.UserId == userId.Value)
            .Select(wm => new WorkspaceDto(
                wm.Workspace.Id,
                wm.Workspace.Name,
                wm.Workspace.Description,
                wm.Workspace.IconUrl,
                wm.Workspace.InviteCode,
                wm.Workspace.OwnerId
            ))
            .ToListAsync(cancellationToken);
    }
}
