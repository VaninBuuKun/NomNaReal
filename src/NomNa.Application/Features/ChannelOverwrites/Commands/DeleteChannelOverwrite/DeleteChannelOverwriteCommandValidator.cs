using FluentValidation;

namespace NomNa.Application.Features.ChannelOverwrites.Commands.DeleteChannelOverwrite;

public class DeleteChannelOverwriteCommandValidator : AbstractValidator<DeleteChannelOverwriteCommand>
{
    public DeleteChannelOverwriteCommandValidator()
    {
        RuleFor(x => x.ChannelId).NotEmpty().WithMessage("ChannelId không được để trống.");
        RuleFor(x => x.OverwriteId).NotEmpty().WithMessage("OverwriteId không được để trống.");
    }
}
