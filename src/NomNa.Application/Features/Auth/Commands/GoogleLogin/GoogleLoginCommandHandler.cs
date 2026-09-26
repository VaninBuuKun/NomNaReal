using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Auth.DTOs;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Auth.Commands.GoogleLogin;

public class GoogleLoginCommandHandler : IRequestHandler<GoogleLoginCommand, Result<AuthResultDto>>
{
    private readonly IGoogleAuthService _googleAuthService;
    private readonly UserManager<User> _userManager;
    private readonly IApplicationDbContext _context;
    private readonly IJwtService _jwtService;

    public GoogleLoginCommandHandler(
        IGoogleAuthService googleAuthService,
        UserManager<User> userManager,
        IApplicationDbContext context,
        IJwtService jwtService)
    {
        _googleAuthService = googleAuthService;
        _userManager = userManager;
        _context = context;
        _jwtService = jwtService;
    }

    public async Task<Result<AuthResultDto>> Handle(GoogleLoginCommand request, CancellationToken cancellationToken)
    {
        // 1. Verify Google token
        var payload = await _googleAuthService.ValidateTokenAsync(request.IdToken, cancellationToken);
        if (payload == null || string.IsNullOrWhiteSpace(payload.Email))
        {
            return Error.Unauthorized("Auth.InvalidGoogleToken", "Invalid Google ID token or email not verified.");
        }

        // 2. Check if user already exists with this Google provider
        var user = await _userManager.FindByLoginAsync("Google", payload.Subject);

        if (user == null)
        {
            // 3. Check if user with this email already exists
            user = await _userManager.FindByEmailAsync(payload.Email);

            if (user != null)
            {
                // Account linking: link Google login info to existing user
                var addLoginResult = await _userManager.AddLoginAsync(user, new UserLoginInfo("Google", payload.Subject, "Google"));
                if (!addLoginResult.Succeeded)
                {
                    return Error.Failure("Auth.GoogleLinkFailed", "Failed to link Google account.");
                }
            }
            else
            {
                // 4. Create new user for first-time Google sign in
                var emailPrefix = payload.Email.Split('@')[0].Replace(".", "_");
                var candidateUsername = emailPrefix;
                var counter = 1;

                while (await _context.Users.AnyAsync(u => u.UserName == candidateUsername, cancellationToken))
                {
                    candidateUsername = $"{emailPrefix}_{counter++}";
                }

                user = new User
                {
                    Email = payload.Email,
                    UserName = candidateUsername,
                    DisplayName = !string.IsNullOrWhiteSpace(payload.Name) ? payload.Name : candidateUsername,
                    AvatarUrl = payload.Picture,
                    EmailConfirmed = true,
                    Status = UserStatus.Online
                };

                var createResult = await _userManager.CreateAsync(user);
                if (!createResult.Succeeded)
                {
                    var errorMessage = createResult.Errors.FirstOrDefault()?.Description ?? "Failed to create user from Google profile.";
                    return Error.Failure("Auth.GoogleRegistrationFailed", errorMessage);
                }

                await _userManager.AddLoginAsync(user, new UserLoginInfo("Google", payload.Subject, "Google"));
            }
        }

        user.UpdateStatus(UserStatus.Online);
        if (!string.IsNullOrWhiteSpace(payload.Picture) && string.IsNullOrWhiteSpace(user.AvatarUrl))
        {
            user.AvatarUrl = payload.Picture;
        }

        // 5. Generate tokens
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
