using FluentValidation;

namespace NomNa.Application.Features.Channels.Commands.DeleteChannel;

public class DeleteChannelCommandValidator : AbstractValidator<DeleteChannelCommand>
{
    public DeleteChannelCommandValidator()
    {
        RuleFor(x => x.ChannelId).NotEmpty();
    }
}
