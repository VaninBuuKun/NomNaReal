using FluentValidation;

namespace NomNa.Application.Features.Channels.Commands.UpdateChannel;

public class UpdateChannelCommandValidator : AbstractValidator<UpdateChannelCommand>
{
    public UpdateChannelCommandValidator()
    {
        RuleFor(x => x.ChannelId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(50).Matches(@"^[a-z0-9\-]+$")
            .WithMessage("Channel names must contain only lowercase letters, numbers, and hyphens.");
    }
}
