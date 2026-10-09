using MediatR;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Servers.Commands.DeleteServer;

public record DeleteServerCommand(Guid ServerId) : IRequest<Result<Unit>>;
