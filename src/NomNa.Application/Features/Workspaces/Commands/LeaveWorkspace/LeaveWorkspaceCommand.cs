using MediatR;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Workspaces.Commands.LeaveWorkspace;

public record LeaveWorkspaceCommand(Guid WorkspaceId) : IRequest<Result<Unit>>;
