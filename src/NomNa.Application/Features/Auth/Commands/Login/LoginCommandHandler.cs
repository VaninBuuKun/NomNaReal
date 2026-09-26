using MediatR;
using Microsoft.AspNetCore.Identity;
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

        var user = await _userManager.FindByEmailAsync(input) 
                   ?? await _userManager.FindByNameAsync(input);

        if (user == null)
        {
            return Error.Unauthorized("Auth.InvalidCredentials", "Invalid email/username or password.");
        }

        if (await _userManager.IsLockedOutAsync(user))
        {
            return Error.Forbidden("Auth.AccountLocked", "Account is temporarily locked due to multiple failed login attempts. Please try again later.");
        }

        bool passwordValid = false;

        // Fallback for existing legacy BCrypt hashed passwords and transparent auto-upgrade
        if (!string.IsNullOrEmpty(user.PasswordHash) && user.PasswordHash.StartsWith("$2"))
        {
            if (BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                passwordValid = true;
                user.PasswordHash = _userManager.PasswordHasher.HashPassword(user, request.Password);
                await _userManager.UpdateAsync(user);
            }
        }
        else
        {
            passwordValid = await _userManager.CheckPasswordAsync(user, request.Password);
        }

        if (!passwordValid)
        {
            await _userManager.AccessFailedAsync(user);
            return Error.Unauthorized("Auth.InvalidCredentials", "Invalid email/username or password.");
        }

        await _userManager.ResetAccessFailedCountAsync(user);
        user.UpdateStatus(UserStatus.Online);

        var (accessToken, expiresAt) = _jwtService.GenerateAccessToken(user.Id, user.Email ?? string.Empty, user.Username);
        var rawRefreshToken = _jwtService.GenerateRefreshToken();

        var refreshTokenEntity = new NomNa.Domain.Entities.RefreshToken
        {
            UserId = user.Id,
            TokenHash = BCrypt.Net.BCrypt.HashPassword(rawRefreshToken),
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        _context.RefreshTokens.Add(refreshTokenEntity);
        await _context.SaveChangesAsync(cancellationToken);

        var userDto = new UserDto(user.Id, user.Email ?? string.Empty, user.Username, user.DisplayName, user.AvatarUrl, user.Bio, user.Status);
        return new AuthResultDto(accessToken, rawRefreshToken, expiresAt, userDto);
    }
}
