using FluentValidation;

namespace NomNa.Application.Features.Roles.Commands.UnassignRole;

public class UnassignRoleCommandValidator : AbstractValidator<UnassignRoleCommand>
{
    public UnassignRoleCommandValidator()
    {
        RuleFor(x => x.ServerId).NotEmpty().WithMessage("ServerId không được để trống.");
        RuleFor(x => x.ServerMemberId).NotEmpty().WithMessage("ServerMemberId không được để trống.");
        RuleFor(x => x.RoleId).NotEmpty().WithMessage("RoleId không được để trống.");
    }
}
