using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Common.Security;
using NomNa.Application.Features.Roles.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Roles.Commands.CreateRole;

public record CreateRoleCommand(
    Guid ServerId,
    string Name,
    long Permissions = (long)NomNa.Domain.Enums.Permissions.Default,
    string? ColorHex = null,
    bool IsHoisted = false,
    bool IsMentionable = false
) : IRequest<Result<RoleDto>>, IRequireServerPermission
{
    public Permissions RequiredPermission => NomNa.Domain.Enums.Permissions.ManageRoles;
}
