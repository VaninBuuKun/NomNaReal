using FluentValidation;

namespace NomNa.Application.Features.Messages.Commands.EditMessage;

public class EditMessageCommandValidator : AbstractValidator<EditMessageCommand>
{
    public EditMessageCommandValidator()
    {
        RuleFor(x => x.MessageId)
            .NotEmpty().WithMessage("MessageId is required.");

        RuleFor(x => x.Content)
            .NotEmpty().WithMessage("Content cannot be empty.")
            .MaximumLength(4000).WithMessage("Message cannot exceed 4000 characters.");
    }
}
