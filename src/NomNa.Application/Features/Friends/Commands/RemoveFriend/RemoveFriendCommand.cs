using MediatR;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Friends.Commands.RemoveFriend;

public record RemoveFriendCommand(Guid FriendshipId) : IRequest<Result>;
