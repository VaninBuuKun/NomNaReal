using FluentValidation;

namespace NomNa.Application.Features.ChannelOverwrites.Commands.SetChannelOverwrite;

public class SetChannelOverwriteCommandValidator : AbstractValidator<SetChannelOverwriteCommand>
{
    public SetChannelOverwriteCommandValidator()
    {
        RuleFor(x => x.ChannelId).NotEmpty().WithMessage("ChannelId không được để trống.");
        RuleFor(x => x.TargetId).NotEmpty().WithMessage("TargetId không được để trống.");
        RuleFor(x => x.TargetType).IsInEnum().WithMessage("TargetType không hợp lệ.");
    }
}
