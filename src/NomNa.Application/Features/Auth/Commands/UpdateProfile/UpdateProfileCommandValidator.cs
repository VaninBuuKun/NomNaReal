using FluentValidation;

namespace NomNa.Application.Features.Auth.Commands.UpdateProfile;

public class UpdateProfileCommandValidator : AbstractValidator<UpdateProfileCommand>
{
    public UpdateProfileCommandValidator()
    {
        RuleFor(x => x.DisplayName)
            .MaximumLength(100).WithMessage("Display name cannot exceed 100 characters.")
            .When(x => !string.IsNullOrEmpty(x.DisplayName));

        RuleFor(x => x.AvatarUrl)
            .MaximumLength(500).WithMessage("Avatar URL cannot exceed 500 characters.")
            .When(x => !string.IsNullOrEmpty(x.AvatarUrl));

        RuleFor(x => x.Bio)
            .MaximumLength(500).WithMessage("Bio cannot exceed 500 characters.")
            .When(x => !string.IsNullOrEmpty(x.Bio));
    }
}
