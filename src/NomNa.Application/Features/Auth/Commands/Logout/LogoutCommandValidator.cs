using FluentValidation;

namespace NomNa.Application.Features.Auth.Commands.Logout;

public class LogoutCommandValidator : AbstractValidator<LogoutCommand>
{
    public LogoutCommandValidator()
    {
        // When RefreshToken is provided, ensure it is within reasonable length boundaries
        When(x => !string.IsNullOrEmpty(x.RefreshToken), () =>
        {
            RuleFor(x => x.RefreshToken)
                .MaximumLength(512).WithMessage("Refresh token is too long.");
        });
    }
}
