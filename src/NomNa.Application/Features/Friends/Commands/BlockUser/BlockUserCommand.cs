using MediatR;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Friends.Commands.BlockUser;

public record BlockUserCommand(Guid TargetUserId) : IRequest<Result>;
