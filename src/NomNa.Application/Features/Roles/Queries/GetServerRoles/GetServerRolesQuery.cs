using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Roles.DTOs;

namespace NomNa.Application.Features.Roles.Queries.GetServerRoles;

public record GetServerRolesQuery(Guid ServerId) : IRequest<Result<List<RoleDto>>>;
