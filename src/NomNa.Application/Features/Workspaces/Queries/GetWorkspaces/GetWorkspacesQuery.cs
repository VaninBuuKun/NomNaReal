using MediatR;
using NomNa.Application.Features.Workspaces.DTOs;

namespace NomNa.Application.Features.Workspaces.Queries.GetWorkspaces;

public record GetWorkspacesQuery : IRequest<List<WorkspaceDto>>;
