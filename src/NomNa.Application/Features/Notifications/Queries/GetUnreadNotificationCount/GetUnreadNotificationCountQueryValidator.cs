using FluentValidation;

namespace NomNa.Application.Features.Notifications.Queries.GetUnreadNotificationCount;

public class GetUnreadNotificationCountQueryValidator : AbstractValidator<GetUnreadNotificationCountQuery>
{
    public GetUnreadNotificationCountQueryValidator()
    {
    }
}
