using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Roles.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Roles.Commands.UpdateRole;

public class UpdateRoleCommandHandler : IRequestHandler<UpdateRoleCommand, Result<RoleDto>>
{
    private readonly IApplicationDbContext _context;

    public UpdateRoleCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<RoleDto>> Handle(UpdateRoleCommand request, CancellationToken cancellationToken)
    {
        var role = await _context.Roles
            .Include(r => r.MemberRoles)
            .FirstOrDefaultAsync(r => r.Id == request.RoleId && r.ServerId == request.ServerId, cancellationToken);

        if (role == null)
        {
            return Error.NotFound("Role.NotFound", "Role không tồn tại trong server này.");
        }

        // Với role @everyone, bảo vệ Name và Position
        if (role.IsDefault)
        {
            if (request.Name != null && request.Name.Trim() != "@everyone")
            {
                return Error.Conflict("Role.DefaultImmutable", "Không thể đổi tên role @everyone mặc định.");
            }
        }
        else
        {
            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                role.Name = request.Name.Trim();
            }

            if (request.Position.HasValue)
            {
                role.Position = request.Position.Value;
            }
        }

        if (request.Permissions.HasValue)
        {
            role.Permissions = (Permissions)request.Permissions.Value;
        }

        if (request.ColorHex != null)
        {
            role.ColorHex = string.IsNullOrWhiteSpace(request.ColorHex) ? null : request.ColorHex.Trim();
        }

        if (request.IsHoisted.HasValue)
        {
            role.IsHoisted = request.IsHoisted.Value;
        }

        if (request.IsMentionable.HasValue)
        {
            role.IsMentionable = request.IsMentionable.Value;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return new RoleDto(
            role.Id,
            role.ServerId,
            role.Name,
            (long)role.Permissions,
            role.Position,
            role.ColorHex,
            role.IsHoisted,
            role.IsMentionable,
            role.IsDefault,
            role.MemberRoles.Count
        );
    }
}
