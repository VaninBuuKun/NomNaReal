using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Auth.DTOs;

namespace NomNa.Application.Features.Auth.Commands.ResendVerification;

public record ResendVerificationCommand(
    string Email
) : IRequest<Result<AuthActionResponseDto>>;
