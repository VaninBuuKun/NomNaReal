using MediatR;
using NomNa.Application.Features.Auth.DTOs;

namespace NomNa.Application.Features.Auth.Queries.GetCurrentUser;

public record GetCurrentUserQuery : IRequest<UserDto>;
