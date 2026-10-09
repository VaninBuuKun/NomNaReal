using MediatR;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Friends.Commands.DeclineFriendRequest;

public record DeclineFriendRequestCommand(Guid FriendshipId) : IRequest<Result>;
