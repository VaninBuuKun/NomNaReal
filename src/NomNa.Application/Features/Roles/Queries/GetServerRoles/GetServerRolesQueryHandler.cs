using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Roles.DTOs;

namespace NomNa.Application.Features.Roles.Queries.GetServerRoles;

public class GetServerRolesQueryHandler : IRequestHandler<GetServerRolesQuery, Result<List<RoleDto>>>
{
    private readonly IApplicationDbContext _context;

    public GetServerRolesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<RoleDto>>> Handle(GetServerRolesQuery request, CancellationToken cancellationToken)
    {
        var serverExists = await _context.Servers
            .AsNoTracking()
            .AnyAsync(s => s.Id == request.ServerId, cancellationToken);

        if (!serverExists)
        {
            return Error.NotFound("Server.NotFound", "Server không tồn tại.");
        }

        var roles = await _context.Roles
            .AsNoTracking()
            .Where(r => r.ServerId == request.ServerId)
            .OrderBy(r => r.Position)
            .Select(r => new RoleDto(
                r.Id,
                r.ServerId,
                r.Name,
                (long)r.Permissions,
                r.Position,
                r.ColorHex,
                r.IsHoisted,
                r.IsMentionable,
                r.IsDefault,
                r.MemberRoles.Count
            ))
            .ToListAsync(cancellationToken);

        return roles;
    }
}
