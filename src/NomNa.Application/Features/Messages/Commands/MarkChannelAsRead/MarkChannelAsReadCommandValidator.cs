using FluentValidation;

namespace NomNa.Application.Features.Messages.Commands.MarkChannelAsRead;

public class MarkChannelAsReadCommandValidator : AbstractValidator<MarkChannelAsReadCommand>
{
    public MarkChannelAsReadCommandValidator()
    {
        RuleFor(x => x.ChannelId)
            .NotEmpty().WithMessage("ChannelId is required.");

        RuleFor(x => x.MessageId)
            .NotEmpty().WithMessage("MessageId is required.");
    }
}
