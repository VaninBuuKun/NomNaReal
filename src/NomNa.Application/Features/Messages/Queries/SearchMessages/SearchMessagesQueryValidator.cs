using FluentValidation;

namespace NomNa.Application.Features.Messages.Queries.SearchMessages;

public class SearchMessagesQueryValidator : AbstractValidator<SearchMessagesQuery>
{
    public SearchMessagesQueryValidator()
    {
        RuleFor(x => x.WorkspaceId).NotEmpty();
        RuleFor(x => x.Limit).InclusiveBetween(1, 100);

        RuleFor(x => x)
            .Must(x => !string.IsNullOrWhiteSpace(x.Keyword) || x.SenderId.HasValue || x.FromDate.HasValue || x.ToDate.HasValue)
            .WithMessage("At least one search filter (keyword, sender, or date range) must be provided.");

        When(x => x.FromDate.HasValue && x.ToDate.HasValue, () =>
        {
            RuleFor(x => x.ToDate)
                .GreaterThanOrEqualTo(x => x.FromDate)
                .WithMessage("End date must be greater than or equal to start date.");
        });
    }
}
