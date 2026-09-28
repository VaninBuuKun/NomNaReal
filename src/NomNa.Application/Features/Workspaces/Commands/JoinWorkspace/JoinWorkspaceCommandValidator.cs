using FluentValidation;

namespace NomNa.Application.Features.Workspaces.Commands.JoinWorkspace;

public class JoinWorkspaceCommandValidator : AbstractValidator<JoinWorkspaceCommand>
{
    public JoinWorkspaceCommandValidator()
    {
        RuleFor(x => x.InviteCode)
            .NotEmpty().WithMessage("Vui lòng nhập mã mời hoặc đường dẫn tham gia.")
            .MaximumLength(150).WithMessage("Mã mời không hợp lệ.");
    }
}
