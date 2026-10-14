using FluentValidation;

namespace NomNa.Application.Features.ChannelOverwrites.Queries.GetChannelOverwrites;

public class GetChannelOverwritesQueryValidator : AbstractValidator<GetChannelOverwritesQuery>
{
    public GetChannelOverwritesQueryValidator()
    {
        RuleFor(x => x.ChannelId).NotEmpty().WithMessage("ChannelId không được để trống.");
    }
}
