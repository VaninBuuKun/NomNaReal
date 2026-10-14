using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Roles.DTOs;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Roles.Commands.CreateRole;

public class CreateRoleCommandHandler : IRequestHandler<CreateRoleCommand, Result<RoleDto>>
{
    private readonly IApplicationDbContext _context;

    public CreateRoleCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<RoleDto>> Handle(CreateRoleCommand request, CancellationToken cancellationToken)
    {
        var server = await _context.Servers
            .Include(s => s.Roles)
            .FirstOrDefaultAsync(s => s.Id == request.ServerId, cancellationToken);

        if (server == null)
        {
            return Error.NotFound("Server.NotFound", "Server không tồn tại.");
        }

        var maxPosition = server.Roles.Any() ? server.Roles.Max(r => r.Position) : 0;

        var role = new Role
        {
            ServerId = request.ServerId,
            Name = request.Name.Trim(),
            Permissions = (Permissions)request.Permissions,
            Position = maxPosition + 1,
            ColorHex = request.ColorHex?.Trim(),
            IsHoisted = request.IsHoisted,
            IsMentionable = request.IsMentionable,
            IsDefault = false
        };

        _context.Roles.Add(role);
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
            0
        );
    }
}
