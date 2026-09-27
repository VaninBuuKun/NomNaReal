using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Workspaces.DTOs;

namespace NomNa.Application.Features.Workspaces.Commands.CreateWorkspace;

public record CreateWorkspaceCommand(
    string Name,
    string? Description,
    string IconUrl
) : IRequest<Result<WorkspaceDto>>;
