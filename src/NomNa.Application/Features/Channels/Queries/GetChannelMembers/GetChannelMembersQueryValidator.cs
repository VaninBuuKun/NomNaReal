using FluentValidation;

namespace NomNa.Application.Features.Channels.Queries.GetChannelMembers;

public class GetChannelMembersQueryValidator : AbstractValidator<GetChannelMembersQuery>
{
    public GetChannelMembersQueryValidator()
    {
        RuleFor(x => x.ChannelId).NotEmpty();
    }
}
