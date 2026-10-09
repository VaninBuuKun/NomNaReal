using FluentValidation;

namespace NomNa.Application.Features.Servers.Commands.JoinServer;

public class JoinServerCommandValidator : AbstractValidator<JoinServerCommand>
{
    public JoinServerCommandValidator()
    {
        RuleFor(x => x.InviteCode)
            .NotEmpty().WithMessage("Vui lòng nhập mã mời hoặc đường dẫn tham gia.")
            .MaximumLength(150).WithMessage("Mã mời không hợp lệ.");
    }
}
