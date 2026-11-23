using FluentValidation;

namespace NomNa.Application.Features.Channels.Commands.UpdateChannelSlowmode;

public class UpdateChannelSlowmodeCommandValidator : AbstractValidator<UpdateChannelSlowmodeCommand>
{
    public UpdateChannelSlowmodeCommandValidator()
    {
        RuleFor(x => x.ChannelId).NotEmpty();
        RuleFor(x => x.SlowmodeSeconds)
            .InclusiveBetween(0, 21600) // 0 to 6 hours (21600 seconds)
            .WithMessage("Slowmode must be between 0 (disabled) and 21600 seconds (6 hours).");
    }
}

