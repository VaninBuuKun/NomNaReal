using FluentValidation;

namespace NomNa.Application.Features.Messages.Commands.UnpinMessage;

public class UnpinMessageCommandValidator : AbstractValidator<UnpinMessageCommand>
{
    public UnpinMessageCommandValidator()
    {
        RuleFor(x => x.MessageId)
            .NotEmpty().WithMessage("MessageId is required.");
    }
}
