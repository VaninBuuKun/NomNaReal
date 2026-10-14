using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Domain.Entities;

namespace NomNa.Application.Features.Roles.Commands.AssignRole;

public class AssignRoleCommandHandler : IRequestHandler<AssignRoleCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public AssignRoleCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(AssignRoleCommand request, CancellationToken cancellationToken)
    {
        var member = await _context.ServerMembers
            .Include(m => m.MemberRoles)
            .FirstOrDefaultAsync(m => m.Id == request.ServerMemberId && m.ServerId == request.ServerId, cancellationToken);

        if (member == null)
        {
            return Error.NotFound("Member.NotFound", "Thành viên không thuộc server này.");
        }

        var roleExists = await _context.Roles
            .AnyAsync(r => r.Id == request.RoleId && r.ServerId == request.ServerId, cancellationToken);

        if (!roleExists)
        {
            return Error.NotFound("Role.NotFound", "Role không tồn tại trong server này.");
        }

        var alreadyAssigned = member.MemberRoles.Any(mr => mr.RoleId == request.RoleId);
        if (alreadyAssigned)
        {
            return Result.Success(); // Idempotent
        }

        member.MemberRoles.Add(new MemberRole
        {
            ServerMemberId = member.Id,
            RoleId = request.RoleId
        });

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
