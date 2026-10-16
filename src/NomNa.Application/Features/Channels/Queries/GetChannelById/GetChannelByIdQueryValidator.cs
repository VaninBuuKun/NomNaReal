using FluentValidation;

namespace NomNa.Application.Features.Channels.Queries.GetChannelById;

public class GetChannelByIdQueryValidator : AbstractValidator<GetChannelByIdQuery>
{
    public GetChannelByIdQueryValidator()
    {
        RuleFor(x => x.ChannelId)
            .NotEmpty().WithMessage("Channel ID không được để trống.");
    }
}
