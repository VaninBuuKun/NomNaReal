using FluentValidation;

namespace NomNa.Application.Features.Auth.Commands.ForgotPassword;

public class ForgotPasswordCommandValidator : AbstractValidator<ForgotPasswordCommand>
{
    public ForgotPasswordCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Địa chỉ email là bắt buộc.")
            .EmailAddress().WithMessage("Địa chỉ email không hợp lệ.");
    }
}
