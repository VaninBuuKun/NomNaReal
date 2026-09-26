using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using PulseChat.Application.Common.Exceptions;
using PulseChat.Application.Common.Interfaces;
using PulseChat.Application.Features.Workspaces.DTOs;
using PulseChat.Domain.Entities;
using PulseChat.Domain.Enums;

namespace PulseChat.Application.Features.Workspaces.Queries.GetWorkspaces;

public record GetWorkspacesQuery : IRequest<List<WorkspaceDto>>;

public class GetWorkspacesQueryHandler : IRequestHandler<GetWorkspacesQuery, List<WorkspaceDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetWorkspacesQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<List<WorkspaceDto>> Handle(GetWorkspacesQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            throw new UnauthorizedException();

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
