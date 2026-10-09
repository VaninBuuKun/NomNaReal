using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Friends.DTOs;

namespace NomNa.Application.Features.Friends.Commands.AcceptFriendRequest;

public record AcceptFriendRequestCommand(Guid FriendshipId) : IRequest<Result<FriendDto>>;
