using FluentValidation;

namespace NomNa.Application.Features.Roles.Commands.DeleteRole;

public class DeleteRoleCommandValidator : AbstractValidator<DeleteRoleCommand>
{
    public DeleteRoleCommandValidator()
    {
        RuleFor(x => x.ServerId)
            .NotEmpty().WithMessage("ServerId không được để trống.");

        RuleFor(x => x.RoleId)
            .NotEmpty().WithMessage("RoleId không được để trống.");
    }
}
