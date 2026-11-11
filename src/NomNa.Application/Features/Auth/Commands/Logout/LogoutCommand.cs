using MediatR;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Auth.Commands.Logout;

public record LogoutCommand(string? RefreshToken, bool RevokeAllDevices = false) : IRequest<Result>;

