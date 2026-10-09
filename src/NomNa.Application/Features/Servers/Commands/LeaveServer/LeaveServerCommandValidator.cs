using FluentValidation;

namespace NomNa.Application.Features.Servers.Commands.LeaveServer;

public class LeaveServerCommandValidator : AbstractValidator<LeaveServerCommand>
{
    public LeaveServerCommandValidator()
    {
        RuleFor(x => x.ServerId).NotEmpty();
    }
}
