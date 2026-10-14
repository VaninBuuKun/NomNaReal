using FluentValidation;

namespace NomNa.Application.Features.Roles.Commands.CreateRole;

public class CreateRoleCommandValidator : AbstractValidator<CreateRoleCommand>
{
    public CreateRoleCommandValidator()
    {
        RuleFor(x => x.ServerId)
            .NotEmpty().WithMessage("ServerId không được để trống.");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Tên role không được để trống.")
            .MaximumLength(100).WithMessage("Tên role không được vượt quá 100 ký tự.");

        RuleFor(x => x.ColorHex)
            .Matches(@"^#(?:[0-9a-fA-F]{3}){1,2}$")
            .When(x => !string.IsNullOrWhiteSpace(x.ColorHex))
            .WithMessage("Mã màu không hợp lệ (ví dụ: #FF5733).");
    }
}
