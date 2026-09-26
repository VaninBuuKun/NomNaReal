using MediatR;
using NomNa.Application.Features.Auth.DTOs;

namespace NomNa.Application.Features.Auth.Commands.RefreshToken;

public record RefreshTokenCommand(
    Guid UserId,
    string RefreshToken
) : IRequest<AuthResultDto>;
