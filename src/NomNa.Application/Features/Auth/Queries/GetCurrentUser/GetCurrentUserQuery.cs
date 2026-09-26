using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Auth.DTOs;

namespace NomNa.Application.Features.Auth.Queries.GetCurrentUser;

public record GetCurrentUserQuery : IRequest<Result<UserDto>>;
