using FluentValidation;

namespace NomNa.Application.Features.Auth.Commands.VerifyEmail;

public class VerifyEmailCommandValidator : AbstractValidator<VerifyEmailCommand>
{
    public VerifyEmailCommandValidator()
    {
        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("Mã xác thực là bắt buộc.");
    }
}
