using FluentValidation;

namespace NomNa.Application.Features.Servers.Commands.CreateServer;

public class CreateServerCommandValidator : AbstractValidator<CreateServerCommand>
{
    public CreateServerCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Server name is required.")
            .MaximumLength(100).WithMessage("Server name cannot exceed 100 characters.");

        RuleFor(x => x.IconUrl)
            .NotEmpty().WithMessage("Server avatar / icon is required.");
    }
}
