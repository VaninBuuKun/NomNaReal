using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Auth.DTOs;

namespace NomNa.Application.Features.Auth.Commands.Login;

public record LoginCommand(
    string EmailOrUsername,
    string Password
) : IRequest<Result<AuthResultDto>>;
