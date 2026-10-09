using MediatR;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Friends.Commands.UnblockUser;

public record UnblockUserCommand(Guid TargetUserId) : IRequest<Result>;
