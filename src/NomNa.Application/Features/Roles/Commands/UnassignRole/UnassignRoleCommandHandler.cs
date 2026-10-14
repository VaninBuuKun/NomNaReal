using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Roles.Commands.UnassignRole;

public class UnassignRoleCommandHandler : IRequestHandler<UnassignRoleCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public UnassignRoleCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(UnassignRoleCommand request, CancellationToken cancellationToken)
    {
        var memberRole = await _context.MemberRoles
            .FirstOrDefaultAsync(mr => 
                mr.ServerMemberId == request.ServerMemberId && 
                mr.RoleId == request.RoleId &&
                mr.ServerMember.ServerId == request.ServerId, cancellationToken);

        if (memberRole == null)
        {
            return Result.Success(); // Idempotent
        }

        _context.MemberRoles.Remove(memberRole);
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
