using FluentValidation;

namespace NomNa.Application.Features.Tasks.Commands.CreateTask;

public class CreateTaskCommandValidator : AbstractValidator<CreateTaskCommand>
{
    public CreateTaskCommandValidator()
    {
        RuleFor(x => x.ChannelId)
            .NotEmpty().WithMessage("ChannelId is required.");

        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Tên công việc không được để trống.")
            .MaximumLength(300).WithMessage("Tên công việc không được vượt quá 300 ký tự.");

        RuleFor(x => x.Note)
            .MaximumLength(2000).WithMessage("Ghi chú không được vượt quá 2000 ký tự.");

        RuleFor(x => x.AttachmentUrl)
            .MaximumLength(1000).WithMessage("Đường dẫn tài liệu không được vượt quá 1000 ký tự.");
    }
}
