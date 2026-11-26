using FluentValidation;

namespace NomNa.Application.Features.Servers.Commands.UnbanServerMember;

public class UnbanServerMemberCommandValidator : AbstractValidator<UnbanServerMemberCommand>
{
    public UnbanServerMemberCommandValidator()
    {
        RuleFor(x => x.ServerId).NotEmpty();
        RuleFor(x => x.UserId).NotEmpty();
        RuleFor(x => x.Reason).MaximumLength(500);
    }
}

