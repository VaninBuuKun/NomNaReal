using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Auth.DTOs;

namespace NomNa.Application.Features.Auth.Commands.UpdateProfile;

public record UpdateProfileCommand(
    string? DisplayName,
    string? AvatarUrl,
    string? Bio
) : IRequest<Result<UserDto>>;
