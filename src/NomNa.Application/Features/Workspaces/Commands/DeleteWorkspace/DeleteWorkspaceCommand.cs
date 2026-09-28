using MediatR;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Workspaces.Commands.DeleteWorkspace;

public record DeleteWorkspaceCommand(Guid WorkspaceId) : IRequest<Result<Unit>>;
