using FluentValidation;

namespace NomNa.Application.Features.Channels.Commands.AddChannelMember;

public class AddChannelMemberCommandValidator : AbstractValidator<AddChannelMemberCommand>
{
    public AddChannelMemberCommandValidator()
    {
        RuleFor(x => x.ChannelId).NotEmpty();
        RuleFor(x => x.UserId).NotEmpty();
    }
}
