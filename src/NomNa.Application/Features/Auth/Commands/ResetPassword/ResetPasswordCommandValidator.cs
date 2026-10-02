using FluentValidation;

namespace NomNa.Application.Features.Auth.Commands.ResetPassword;

public class ResetPasswordCommandValidator : AbstractValidator<ResetPasswordCommand>
{
    public ResetPasswordCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Địa chỉ email là bắt buộc.")
            .EmailAddress().WithMessage("Địa chỉ email không hợp lệ.");

        RuleFor(x => x.Token)
            .NotEmpty().WithMessage("Mã xác thực hoặc token là bắt buộc.");

        RuleFor(x => x.NewPassword)
            .NotEmpty().WithMessage("Mật khẩu mới là bắt buộc.")
            .MinimumLength(6).WithMessage("Mật khẩu phải có tối thiểu 6 ký tự.");
    }
}
