using FluentValidation;

namespace NomNa.Application.Features.Messages.Commands.ToggleReaction;

public class ToggleReactionCommandValidator : AbstractValidator<ToggleReactionCommand>
{
    public ToggleReactionCommandValidator()
    {
        RuleFor(x => x.MessageId)
            .NotEmpty().WithMessage("MessageId is required.");

        RuleFor(x => x.Emoji)
            .NotEmpty().WithMessage("Emoji is required.")
            .MaximumLength(32).WithMessage("Emoji length cannot exceed 32 characters.");
    }
}
