using FluentValidation;

namespace NomNa.Application.Features.Tasks.Commands.ToggleTaskStatus;

public class ToggleTaskStatusCommandValidator : AbstractValidator<ToggleTaskStatusCommand>
{
    public ToggleTaskStatusCommandValidator()
    {
        RuleFor(x => x.TaskId)
            .NotEmpty().WithMessage("TaskId is required.");

        RuleFor(x => x.CompletionNote)
            .MaximumLength(2000).WithMessage("Ghi chú phản hồi không được vượt quá 2000 ký tự.");
    }
}
