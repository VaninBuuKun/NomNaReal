using FluentValidation;

namespace NomNa.Application.Features.Channels.Commands.CreateChannel;

public class CreateChannelCommandValidator : AbstractValidator<CreateChannelCommand>
{
    public CreateChannelCommandValidator()
    {
        RuleFor(x => x.ServerId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(50).Matches(@"^[a-z0-9\-]+$")
            .WithMessage("Channel names must contain only lowercase letters, numbers, and hyphens.");
    }
}
