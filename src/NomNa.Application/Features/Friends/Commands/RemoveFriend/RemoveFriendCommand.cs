using MediatR;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Friends.Commands.RemoveFriend;

public record RemoveFriendResult(Guid TargetUserId);

public record RemoveFriendCommand(Guid FriendshipId) : IRequest<Result<RemoveFriendResult>>;
