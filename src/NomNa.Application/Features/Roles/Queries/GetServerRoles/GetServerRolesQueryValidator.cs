using FluentValidation;

namespace NomNa.Application.Features.Roles.Queries.GetServerRoles;

public class GetServerRolesQueryValidator : AbstractValidator<GetServerRolesQuery>
{
    public GetServerRolesQueryValidator()
    {
        RuleFor(x => x.ServerId)
            .NotEmpty().WithMessage("ServerId không được để trống.");
    }
}
