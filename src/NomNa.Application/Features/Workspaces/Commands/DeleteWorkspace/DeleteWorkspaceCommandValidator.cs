using FluentValidation;

namespace NomNa.Application.Features.Workspaces.Commands.DeleteWorkspace;

public class DeleteWorkspaceCommandValidator : AbstractValidator<DeleteWorkspaceCommand>
{
    public DeleteWorkspaceCommandValidator()
    {
        RuleFor(x => x.WorkspaceId).NotEmpty();
    }
}
