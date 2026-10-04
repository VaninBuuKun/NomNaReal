using FluentValidation;

namespace NomNa.Application.Features.Tasks.Queries.GetChannelTasks;

public class GetChannelTasksQueryValidator : AbstractValidator<GetChannelTasksQuery>
{
    public GetChannelTasksQueryValidator()
    {
        RuleFor(x => x.ChannelId)
            .NotEmpty().WithMessage("ChannelId is required.");
    }
}
