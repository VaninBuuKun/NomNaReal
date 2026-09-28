using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Workspaces.Commands.DeleteWorkspace;

public class DeleteWorkspaceCommandHandler : IRequestHandler<DeleteWorkspaceCommand, Result<Unit>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public DeleteWorkspaceCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<Unit>> Handle(DeleteWorkspaceCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var workspace = await _context.Workspaces
            .FirstOrDefaultAsync(w => w.Id == request.WorkspaceId, cancellationToken);

        if (workspace == null)
            return Error.NotFound("Workspace.NotFound", "Workspace not found.");

        if (workspace.OwnerId != userId.Value)
            return Error.Forbidden("Workspace.Forbidden", "Only the workspace owner can delete the workspace.");

        _context.Workspaces.Remove(workspace);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<Unit>.Success(Unit.Value);
    }
}
