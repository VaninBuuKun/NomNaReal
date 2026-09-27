using FluentValidation;

namespace NomNa.Application.Features.Messages.Commands.ReplyToMessage;

public class ReplyToMessageCommandValidator : AbstractValidator<ReplyToMessageCommand>
{
    public ReplyToMessageCommandValidator()
    {
        RuleFor(x => x.ParentMessageId)
            .NotEmpty().WithMessage("Parent message ID is required.");

        RuleFor(x => x.Content)
            .NotEmpty().WithMessage("Message content cannot be empty.")
            .MaximumLength(4000).WithMessage("Message cannot exceed 4000 characters.");
    }
}
