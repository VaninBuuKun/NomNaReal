using FluentValidation;

namespace NomNa.Application.Features.Servers.Commands.TimeoutServerMember;

public class TimeoutServerMemberCommandValidator : AbstractValidator<TimeoutServerMemberCommand>
{
    public TimeoutServerMemberCommandValidator()
    {
        RuleFor(x => x.ServerId).NotEmpty();
        RuleFor(x => x.MemberUserId).NotEmpty();
        RuleFor(x => x.DurationMinutes)
            .InclusiveBetween(0, 40320) // 0 = remove timeout, up to 28 days (40,320 mins)
            .WithMessage("Timeout duration must be between 0 (remove timeout) and 40320 minutes (28 days).");
        RuleFor(x => x.Reason).MaximumLength(500);
    }
}

