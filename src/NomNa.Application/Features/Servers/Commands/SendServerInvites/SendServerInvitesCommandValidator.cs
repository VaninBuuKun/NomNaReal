using FluentValidation;

namespace NomNa.Application.Features.Servers.Commands.SendServerInvites;

public class SendServerInvitesCommandValidator : AbstractValidator<SendServerInvitesCommand>
{
    public SendServerInvitesCommandValidator()
    {
        RuleFor(x => x.ServerId)
            .NotEmpty().WithMessage("Server ID là bắt buộc.");

        RuleFor(x => x.Emails)
            .NotEmpty().WithMessage("Danh sách email không được để trống.")
            .Must(e => e.Count <= 50).WithMessage("Mỗi lần gửi tối đa 50 địa chỉ email.");

        RuleForEach(x => x.Emails)
            .NotEmpty().WithMessage("Địa chỉ email không được để trống.")
            .EmailAddress().WithMessage("Địa chỉ email không hợp lệ: '{PropertyValue}'.");
    }
}
