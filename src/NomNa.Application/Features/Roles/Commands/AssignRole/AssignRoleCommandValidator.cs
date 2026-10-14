using FluentValidation;

namespace NomNa.Application.Features.Roles.Commands.AssignRole;

public class AssignRoleCommandValidator : AbstractValidator<AssignRoleCommand>
{
    public AssignRoleCommandValidator()
    {
        RuleFor(x => x.ServerId).NotEmpty().WithMessage("ServerId không được để trống.");
        RuleFor(x => x.ServerMemberId).NotEmpty().WithMessage("ServerMemberId không được để trống.");
        RuleFor(x => x.RoleId).NotEmpty().WithMessage("RoleId không được để trống.");
    }
}
