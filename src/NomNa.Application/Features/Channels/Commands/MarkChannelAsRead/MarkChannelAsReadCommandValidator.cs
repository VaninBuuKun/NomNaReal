using FluentValidation;

namespace NomNa.Application.Features.Channels.Commands.MarkChannelAsRead;

public class MarkChannelAsReadCommandValidator : AbstractValidator<MarkChannelAsReadCommand>
{
    public MarkChannelAsReadCommandValidator()
    {
        RuleFor(x => x.ChannelId).NotEmpty();
    }
}
