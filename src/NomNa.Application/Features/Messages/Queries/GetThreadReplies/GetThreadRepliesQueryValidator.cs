using FluentValidation;

namespace NomNa.Application.Features.Messages.Queries.GetThreadReplies;

public class GetThreadRepliesQueryValidator : AbstractValidator<GetThreadRepliesQuery>
{
    public GetThreadRepliesQueryValidator()
    {
        RuleFor(x => x.ParentMessageId)
            .NotEmpty().WithMessage("Parent message ID is required.");
    }
}
