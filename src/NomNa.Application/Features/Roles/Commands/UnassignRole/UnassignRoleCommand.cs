using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Common.Security;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Roles.Commands.UnassignRole;

public record UnassignRoleCommand(Guid ServerId, Guid ServerMemberId, Guid RoleId) 
    : IRequest<Result>, IRequireServerPermission
{
    public Permissions RequiredPermission => Permissions.ManageRoles;
}
