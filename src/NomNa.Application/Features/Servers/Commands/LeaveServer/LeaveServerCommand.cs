using MediatR;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Servers.Commands.LeaveServer;

public record LeaveServerCommand(Guid ServerId) : IRequest<Result<Unit>>;
