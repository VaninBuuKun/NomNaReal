using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Workspaces.Commands.KickWorkspaceMember;

public class KickWorkspaceMemberCommandHandler : IRequestHandler<KickWorkspaceMemberCommand, Result<Unit>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public KickWorkspaceMemberCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<Unit>> Handle(KickWorkspaceMemberCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        if (userId.Value == request.MemberUserId)
            return Error.Conflict("Workspace.CannotKickSelf", "You cannot kick yourself from the workspace. Use leave instead.");

        var workspace = await _context.Workspaces
            .Include(w => w.Members)
            .FirstOrDefaultAsync(w => w.Id == request.WorkspaceId, cancellationToken);

        if (workspace == null)
            return Error.NotFound("Workspace.NotFound", "Workspace not found.");

        var currentMember = workspace.Members.FirstOrDefault(m => m.UserId == userId.Value);
        if (currentMember == null || (currentMember.Role != WorkspaceRole.Owner && currentMember.Role != WorkspaceRole.Admin))
            return Error.Forbidden("Workspace.Forbidden", "Only workspace owners or admins can remove members.");

        var targetMember = workspace.Members.FirstOrDefault(m => m.UserId == request.MemberUserId);
        if (targetMember == null)
            return Error.NotFound("Workspace.MemberNotFound", "Member not found in this workspace.");

        if (targetMember.Role == WorkspaceRole.Owner)
            return Error.Forbidden("Workspace.CannotKickOwner", "The workspace owner cannot be removed.");

        if (currentMember.Role == WorkspaceRole.Admin && targetMember.Role == WorkspaceRole.Admin)
            return Error.Forbidden("Workspace.CannotKickAdmin", "Admins cannot remove other admins.");

        _context.WorkspaceMembers.Remove(targetMember);

        var channelMemberships = await _context.ChannelMembers
            .Where(cm => cm.UserId == request.MemberUserId && cm.Channel.WorkspaceId == request.WorkspaceId)
            .ToListAsync(cancellationToken);

        _context.ChannelMembers.RemoveRange(channelMemberships);

        await _context.SaveChangesAsync(cancellationToken);

        return Result<Unit>.Success(Unit.Value);
    }
}
