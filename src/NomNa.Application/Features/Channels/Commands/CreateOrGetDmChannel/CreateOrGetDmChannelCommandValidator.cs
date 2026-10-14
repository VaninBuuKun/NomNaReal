using FluentValidation;

namespace NomNa.Application.Features.Channels.Commands.CreateOrGetDmChannel;

public class CreateOrGetDmChannelCommandValidator : AbstractValidator<CreateOrGetDmChannelCommand>
{
    public CreateOrGetDmChannelCommandValidator()
    {
        RuleFor(x => x.TargetUserId)
            .NotEmpty().WithMessage("TargetUserId is required.");
    }
}
