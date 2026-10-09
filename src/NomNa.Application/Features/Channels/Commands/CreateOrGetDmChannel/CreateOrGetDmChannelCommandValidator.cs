using FluentValidation;

namespace NomNa.Application.Features.Channels.Commands.CreateOrGetDmChannel;

public class CreateOrGetDmChannelCommandValidator : AbstractValidator<CreateOrGetDmChannelCommand>
{
    public CreateOrGetDmChannelCommandValidator()
    {
        RuleFor(x => x.ServerId)
            .NotEmpty().WithMessage("ServerId is required.");

        RuleFor(x => x.TargetUserId)
            .NotEmpty().WithMessage("TargetUserId is required.");
    }
}
