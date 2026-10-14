using FluentValidation;

namespace NomNa.Application.Features.Roles.Commands.UpdateRole;

public class UpdateRoleCommandValidator : AbstractValidator<UpdateRoleCommand>
{
    public UpdateRoleCommandValidator()
    {
        RuleFor(x => x.ServerId)
            .NotEmpty().WithMessage("ServerId không được để trống.");

        RuleFor(x => x.RoleId)
            .NotEmpty().WithMessage("RoleId không được để trống.");

        RuleFor(x => x.Name)
            .MaximumLength(100).WithMessage("Tên role không được vượt quá 100 ký tự.")
            .When(x => x.Name != null);

        RuleFor(x => x.ColorHex)
            .Matches(@"^#(?:[0-9a-fA-F]{3}){1,2}$")
            .When(x => !string.IsNullOrWhiteSpace(x.ColorHex))
            .WithMessage("Mã màu không hợp lệ (ví dụ: #FF5733).");
    }
}
