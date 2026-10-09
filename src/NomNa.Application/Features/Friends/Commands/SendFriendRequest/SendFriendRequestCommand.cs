using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Friends.DTOs;

namespace NomNa.Application.Features.Friends.Commands.SendFriendRequest;

public record SendFriendRequestCommand(string UsernameOrEmail) : IRequest<Result<FriendDto>>;
