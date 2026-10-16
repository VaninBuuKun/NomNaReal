using FluentValidation;

namespace NomNa.Application.Features.Messages.Queries.GetMessagesAround;

public class GetMessagesAroundQueryValidator : AbstractValidator<GetMessagesAroundQuery>
{
    public GetMessagesAroundQueryValidator()
    {
        RuleFor(x => x.ChannelId)
            .NotEmpty().WithMessage("ChannelId is required.");

        RuleFor(x => x.TargetMessageId)
            .NotEmpty().WithMessage("TargetMessageId is required.");

        RuleFor(x => x.Limit)
            .InclusiveBetween(1, 100).WithMessage("Limit must be between 1 and 100.");
    }
}
