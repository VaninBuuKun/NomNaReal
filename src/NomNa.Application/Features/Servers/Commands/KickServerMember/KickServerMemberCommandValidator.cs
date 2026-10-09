using FluentValidation;

namespace NomNa.Application.Features.Servers.Commands.KickServerMember;

public class KickServerMemberCommandValidator : AbstractValidator<KickServerMemberCommand>
{
    public KickServerMemberCommandValidator()
    {
        RuleFor(x => x.ServerId).NotEmpty();
        RuleFor(x => x.MemberUserId).NotEmpty();
    }
}
