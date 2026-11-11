using FluentValidation;

namespace NomNa.Application.Features.Auth.Commands.UpdateStatusPreference;

/// <summary>
/// Validator for UpdateStatusPreferenceCommand ensuring valid enum ranges.
/// </summary>
public class UpdateStatusPreferenceCommandValidator : AbstractValidator<UpdateStatusPreferenceCommand>
{
    public UpdateStatusPreferenceCommandValidator()
    {
        RuleFor(x => x.Preference)
            .IsInEnum()
            .WithMessage("Invalid status preference value.");
    }
}
