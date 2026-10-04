using FluentValidation;

namespace NomNa.Application.Features.Tasks.Commands.DeleteTask;

public class DeleteTaskCommandValidator : AbstractValidator<DeleteTaskCommand>
{
    public DeleteTaskCommandValidator()
    {
        RuleFor(x => x.TaskId)
            .NotEmpty().WithMessage("TaskId is required.");
    }
}
