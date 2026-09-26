using MediatR;
using NomNa.Application.Features.Auth.DTOs;

namespace NomNa.Application.Features.Auth.Commands.Login;

public record LoginCommand(
    string EmailOrUsername,
    string Password
) : IRequest<AuthResultDto>;
