using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Auth.DTOs;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Auth.Commands.Login;

public class LoginCommandHandler : IRequestHandler<LoginCommand, Result<AuthResultDto>>
{
    private readonly UserManager<User> _userManager;
    private readonly IApplicationDbContext _context;
    private readonly IJwtService _jwtService;

    public LoginCommandHandler(
        UserManager<User> userManager,
        IApplicationDbContext context,
        IJwtService jwtService)
    {
        _userManager = userManager;
        _context = context;
        _jwtService = jwtService;
    }

    public async Task<Result<AuthResultDto>> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var input = request.EmailOrUsername.Trim().ToLowerInvariant();

        var user = await _userManager.Users
            .FirstOrDefaultAsync(u => u.Email == input || u.UserName == input, cancellationToken: cancellationToken);

        if (user == null)
        {
            return Error.Unauthorized("Auth.InvalidCredentials", "Invalid email/username or password.");
        }

        if (await _userManager.IsLockedOutAsync(user))
        {
            return Error.Forbidden("Auth.AccountLocked", "Account is temporarily locked due to multiple failed login attempts. Please try again later.");
        }

        bool passwordValid = await _userManager.CheckPasswordAsync(user, request.Password);

        if (!passwordValid)
        {
            await _userManager.AccessFailedAsync(user);
            return Error.Unauthorized("Auth.InvalidCredentials", "Invalid email/username or password.");
        }

        await _userManager.ResetAccessFailedCountAsync(user);
        user.UpdateStatus(UserStatus.Online);

        var (accessToken, expiresAt) = _jwtService.GenerateAccessToken(user.Id, user.Email ?? string.Empty, user.UserName);
        var rawRefreshToken = _jwtService.GenerateRefreshToken();

        var refreshTokenEntity = new Domain.Entities.RefreshToken
        {
            UserId = user.Id,
            TokenHash = _jwtService.HashToken(rawRefreshToken),
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        _context.RefreshTokens.Add(refreshTokenEntity);
        await _context.SaveChangesAsync(cancellationToken);

        var userDto = new UserDto(user.Id, user.Email, user.UserName, user.DisplayName, user.AvatarUrl, user.Bio, user.Status);
        return new AuthResultDto(accessToken, rawRefreshToken, expiresAt, userDto);
    }
}
