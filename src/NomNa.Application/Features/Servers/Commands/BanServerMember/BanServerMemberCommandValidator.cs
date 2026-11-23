using FluentValidation;

namespace NomNa.Application.Features.Servers.Commands.BanServerMember;

public class BanServerMemberCommandValidator : AbstractValidator<BanServerMemberCommand>
{
    public BanServerMemberCommandValidator()
    {
        RuleFor(x => x.ServerId).NotEmpty();
        RuleFor(x => x.MemberUserId).NotEmpty();
        RuleFor(x => x.Reason).MaximumLength(500);
    }
}

