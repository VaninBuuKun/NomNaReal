using FluentValidation;

namespace NomNa.Application.Features.Workspaces.Commands.CreateWorkspace;

public class CreateWorkspaceCommandValidator : AbstractValidator<CreateWorkspaceCommand>
{
    public CreateWorkspaceCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Workspace name is required.")
            .MaximumLength(100).WithMessage("Workspace name cannot exceed 100 characters.");

        RuleFor(x => x.IconUrl)
            .NotEmpty().WithMessage("Workspace avatar / icon is required.");
    }
}
