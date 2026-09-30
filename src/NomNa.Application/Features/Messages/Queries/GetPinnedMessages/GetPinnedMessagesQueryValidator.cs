using FluentValidation;

namespace NomNa.Application.Features.Messages.Queries.GetPinnedMessages;

public class GetPinnedMessagesQueryValidator : AbstractValidator<GetPinnedMessagesQuery>
{
    public GetPinnedMessagesQueryValidator()
    {
        RuleFor(x => x.ChannelId)
            .NotEmpty().WithMessage("ChannelId is required.");
    }
}
