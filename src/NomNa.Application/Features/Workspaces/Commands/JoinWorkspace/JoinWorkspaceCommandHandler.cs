using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Workspaces.DTOs;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Workspaces.Commands.JoinWorkspace;

public class JoinWorkspaceCommandHandler : IRequestHandler<JoinWorkspaceCommand, Result<WorkspaceDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public JoinWorkspaceCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<WorkspaceDto>> Handle(JoinWorkspaceCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var cleanCode = request.InviteCode.Trim();

        // If user pasted a full URL like "http://.../join/NEXUS123", extract the last segment
        if (cleanCode.Contains('/'))
        {
            cleanCode = cleanCode.Split('/', StringSplitOptions.RemoveEmptyEntries).Last();
        }

        var workspace = await _context.Workspaces
            .Include(w => w.Members)
            .FirstOrDefaultAsync(w => w.InviteCode.ToUpper() == cleanCode.ToUpper(), cancellationToken);

        if (workspace == null)
        {
            return Error.NotFound("Workspace.NotFound", "Mã mời không chính xác hoặc không gian làm việc không tồn tại.");
        }

        var isAlreadyMember = workspace.Members.Any(m => m.UserId == userId.Value);
        if (isAlreadyMember)
        {
            // Already a member - return workspace directly
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

        // Add as Member directly to DbSet to force EntityState.Added
        var newMember = new WorkspaceMember
        {
            WorkspaceId = workspace.Id,
            UserId = userId.Value,
            Role = WorkspaceRole.Member
        };
        _context.WorkspaceMembers.Add(newMember);

        await _context.SaveChangesAsync(cancellationToken);

        return new WorkspaceDto(
            workspace.Id,
            workspace.Name,
            workspace.Description,
            workspace.IconUrl,
            workspace.InviteCode,
            workspace.OwnerId,
            workspace.Members.Count + 1
        );
    }
}
