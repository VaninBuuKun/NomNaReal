using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Workspaces.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Workspaces.Commands.UpdateWorkspace;

public class UpdateWorkspaceCommandHandler : IRequestHandler<UpdateWorkspaceCommand, Result<WorkspaceDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public UpdateWorkspaceCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<WorkspaceDto>> Handle(UpdateWorkspaceCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var workspace = await _context.Workspaces
            .Include(w => w.Members)
            .FirstOrDefaultAsync(w => w.Id == request.WorkspaceId, cancellationToken);

        if (workspace == null)
            return Error.NotFound("Workspace.NotFound", "Workspace not found.");

        var currentMember = workspace.Members.FirstOrDefault(m => m.UserId == userId.Value);
        if (currentMember == null || (currentMember.Role != WorkspaceRole.Owner && currentMember.Role != WorkspaceRole.Admin))
            return Error.Forbidden("Workspace.Forbidden", "Only workspace owners or admins can update workspace settings.");

        workspace.Name = request.Name.Trim();
        workspace.Description = request.Description?.Trim();
        workspace.IconUrl = request.IconUrl?.Trim();

        await _context.SaveChangesAsync(cancellationToken);

        return new WorkspaceDto(
            workspace.Id,
            workspace.Name,
            workspace.Description,
            workspace.IconUrl,
            workspace.InviteCode,
            workspace.OwnerId,
            workspace.Members.Count
        );
    }
}
