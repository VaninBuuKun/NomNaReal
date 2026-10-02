using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Auth.DTOs;

namespace NomNa.Application.Features.Auth.Commands.VerifyEmail;

public record VerifyEmailCommand(
    string? Email,
    string Code
) : IRequest<Result<AuthActionResponseDto>>;
