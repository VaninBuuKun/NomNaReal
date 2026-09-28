using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Workspaces.DTOs;

namespace NomNa.Application.Features.Workspaces.Commands.UpdateWorkspace;

public record UpdateWorkspaceCommand(
    Guid WorkspaceId,
    string Name,
    string? Description = null,
    string? IconUrl = null
) : IRequest<Result<WorkspaceDto>>;
