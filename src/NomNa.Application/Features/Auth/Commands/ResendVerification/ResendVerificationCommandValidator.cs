using FluentValidation;

namespace NomNa.Application.Features.Auth.Commands.ResendVerification;

public class ResendVerificationCommandValidator : AbstractValidator<ResendVerificationCommand>
{
    public ResendVerificationCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Địa chỉ email là bắt buộc.")
            .EmailAddress().WithMessage("Địa chỉ email không hợp lệ.");
    }
}
