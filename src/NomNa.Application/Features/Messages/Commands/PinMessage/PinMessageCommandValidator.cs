using FluentValidation;

namespace NomNa.Application.Features.Messages.Commands.PinMessage;

public class PinMessageCommandValidator : AbstractValidator<PinMessageCommand>
{
    public PinMessageCommandValidator()
    {
        RuleFor(x => x.MessageId)
            .NotEmpty().WithMessage("MessageId is required.");
    }
}
