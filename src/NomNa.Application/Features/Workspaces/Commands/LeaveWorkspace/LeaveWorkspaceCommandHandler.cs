using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Workspaces.Commands.LeaveWorkspace;

public class LeaveWorkspaceCommandHandler : IRequestHandler<LeaveWorkspaceCommand, Result<Unit>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public LeaveWorkspaceCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<Unit>> Handle(LeaveWorkspaceCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var workspace = await _context.Workspaces
            .FirstOrDefaultAsync(w => w.Id == request.WorkspaceId, cancellationToken);

        if (workspace == null)
            return Error.NotFound("Workspace.NotFound", "Workspace not found.");

        if (workspace.OwnerId == userId.Value)
            return Error.Conflict("Workspace.OwnerCannotLeave", "Chủ sở hữu không thể rời khỏi workspace. Bạn phải chuyển quyền sở hữu hoặc xóa workspace.");

        var member = await _context.WorkspaceMembers
            .FirstOrDefaultAsync(m => m.WorkspaceId == request.WorkspaceId && m.UserId == userId.Value, cancellationToken);

        if (member == null)
            return Error.NotFound("Workspace.NotMember", "You are not a member of this workspace.");

        // Remove workspace membership
        _context.WorkspaceMembers.Remove(member);

        // Also remove from any channel memberships in this workspace
        var channelMemberships = await _context.ChannelMembers
            .Where(cm => cm.UserId == userId.Value && cm.Channel.WorkspaceId == request.WorkspaceId)
            .ToListAsync(cancellationToken);

        _context.ChannelMembers.RemoveRange(channelMemberships);

        await _context.SaveChangesAsync(cancellationToken);

        return Result<Unit>.Success(Unit.Value);
    }
}
