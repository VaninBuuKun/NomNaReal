using MediatR;
using NomNa.Application.Features.Auth.DTOs;

namespace NomNa.Application.Features.Auth.Commands.Register;

public record RegisterCommand(
    string Email,
    string Username,
    string DisplayName,
    string Password
) : IRequest<AuthResultDto>;
