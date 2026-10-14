using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Common.Security;
using NomNa.Application.Features.Roles.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Roles.Commands.UpdateRole;

public record UpdateRoleCommand(
    Guid ServerId,
    Guid RoleId,
    string? Name,
    long? Permissions,
    string? ColorHex,
    bool? IsHoisted,
    bool? IsMentionable,
    int? Position
) : IRequest<Result<RoleDto>>, IRequireServerPermission
{
    public Permissions RequiredPermission => NomNa.Domain.Enums.Permissions.ManageRoles;
}
