using FluentValidation;

namespace NomNa.Application.Features.Workspaces.Commands.SendWorkspaceInvites;

public class SendWorkspaceInvitesCommandValidator : AbstractValidator<SendWorkspaceInvitesCommand>
{
    public SendWorkspaceInvitesCommandValidator()
    {
        RuleFor(x => x.WorkspaceId)
            .NotEmpty().WithMessage("Workspace ID là bắt buộc.");

        RuleFor(x => x.Emails)
            .NotEmpty().WithMessage("Danh sách email không được để trống.")
            .Must(e => e.Count <= 50).WithMessage("Mỗi lần gửi tối đa 50 địa chỉ email.");

        RuleForEach(x => x.Emails)
            .NotEmpty().WithMessage("Địa chỉ email không được để trống.")
            .EmailAddress().WithMessage("Địa chỉ email không hợp lệ: '{PropertyValue}'.");
    }
}
