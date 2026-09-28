using FluentValidation;

namespace NomNa.Application.Features.Workspaces.Commands.LeaveWorkspace;

public class LeaveWorkspaceCommandValidator : AbstractValidator<LeaveWorkspaceCommand>
{
    public LeaveWorkspaceCommandValidator()
    {
        RuleFor(x => x.WorkspaceId).NotEmpty();
    }
}
