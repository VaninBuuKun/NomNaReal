using MediatR;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Tasks.Commands.DeleteTask;

public record DeleteTaskCommand(Guid TaskId) : IRequest<Result>;
