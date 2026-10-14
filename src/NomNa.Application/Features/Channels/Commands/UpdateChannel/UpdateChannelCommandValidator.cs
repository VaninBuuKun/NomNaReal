using FluentValidation;

namespace NomNa.Application.Features.Channels.Commands.UpdateChannel;

public class UpdateChannelCommandValidator : AbstractValidator<UpdateChannelCommand>
{
    public UpdateChannelCommandValidator()
    {
        RuleFor(x => x.ChannelId).NotEmpty();

        When(x => x.Name != null, () =>
        {
            RuleFor(x => x.Name!)
                .NotEmpty()
                .MaximumLength(100);
        });

        When(x => x.Topic != null, () =>
        {
            RuleFor(x => x.Topic!)
                .MaximumLength(1024);
        });
    }
}

