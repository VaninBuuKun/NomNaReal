using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Auth.DTOs;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Auth.Commands.Register;

public class RegisterCommandHandler : IRequestHandler<RegisterCommand, Result<AuthResultDto>>
{
    private readonly UserManager<User> _userManager;
    private readonly IApplicationDbContext _context;
    private readonly IJwtService _jwtService;

    public RegisterCommandHandler(
        UserManager<User> userManager,
        IApplicationDbContext context,
        IJwtService jwtService)
    {
        _userManager = userManager;
        _context = context;
        _jwtService = jwtService;
    }

    public async Task<Result<AuthResultDto>> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        var emailLower = request.Email.Trim().ToLowerInvariant();
        var usernameLower = request.Username.Trim().ToLowerInvariant();

        if (await _context.Users.AnyAsync(u => u.Email == emailLower, cancellationToken))
        {
            return Error.Conflict("Auth.EmailExists", "Email is already registered.");
        }

        if (await _context.Users.AnyAsync(u => u.UserName == usernameLower, cancellationToken))
        {
            return Error.Conflict("Auth.UsernameExists", "Username is already taken.");
        }

        var user = new User
        {
            Email = emailLower,
            UserName = usernameLower,
            DisplayName = request.DisplayName.Trim(),
            AvatarUrl = null,
            Status = UserStatus.Online
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            var err = result.Errors.FirstOrDefault();
            if (err?.Code.Contains("Email", StringComparison.OrdinalIgnoreCase) == true)
                return Error.Conflict("Auth.EmailExists", "Email is already registered.");
            if (err?.Code.Contains("UserName", StringComparison.OrdinalIgnoreCase) == true)
                return Error.Conflict("Auth.UsernameExists", "Username is already taken.");

            return Error.Validation("Auth.RegistrationFailed", err?.Description ?? "Registration failed.");
        }

        // Generate tokens
        var (accessToken, expiresAt) = _jwtService.GenerateAccessToken(user.Id, user.Email ?? string.Empty, user.Username);
        var rawRefreshToken = _jwtService.GenerateRefreshToken();

        var refreshTokenEntity = new NomNa.Domain.Entities.RefreshToken
        {
            UserId = user.Id,
            TokenHash = _jwtService.HashToken(rawRefreshToken),
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        _context.RefreshTokens.Add(refreshTokenEntity);
        await _context.SaveChangesAsync(cancellationToken);

        var userDto = new UserDto(user.Id, user.Email ?? string.Empty, user.Username, user.DisplayName, user.AvatarUrl, user.Bio, user.Status);
        return new AuthResultDto(accessToken, rawRefreshToken, expiresAt, userDto);
    }
}
