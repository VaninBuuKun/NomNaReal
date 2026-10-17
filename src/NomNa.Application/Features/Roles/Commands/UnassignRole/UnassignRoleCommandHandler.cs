using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Roles.Commands.UnassignRole;

public class UnassignRoleCommandHandler : IRequestHandler<UnassignRoleCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly IPermissionService _permissionService;

    public UnassignRoleCommandHandler(IApplicationDbContext context, IPermissionService permissionService)
    {
        _context = context;
        _permissionService = permissionService;
    }

    public async Task<Result> Handle(UnassignRoleCommand request, CancellationToken cancellationToken)
    {
        var memberRole = await _context.MemberRoles
            .Include(mr => mr.ServerMember)
            .FirstOrDefaultAsync(mr => 
                mr.ServerMemberId == request.ServerMemberId && 
                mr.RoleId == request.RoleId &&
                mr.ServerMember.ServerId == request.ServerId, cancellationToken);

        if (memberRole == null)
        {
            return Result.Success(); // Idempotent
        }

        var userId = memberRole.ServerMember.UserId;

        _context.MemberRoles.Remove(memberRole);
        await _context.SaveChangesAsync(cancellationToken);

        _permissionService.InvalidateUser(request.ServerId, userId);

        return Result.Success();
    }
}
