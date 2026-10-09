using FluentValidation;

namespace NomNa.Application.Features.Servers.Commands.DeleteServer;

public class DeleteServerCommandValidator : AbstractValidator<DeleteServerCommand>
{
    public DeleteServerCommandValidator()
    {
        RuleFor(x => x.ServerId).NotEmpty();
    }
}
