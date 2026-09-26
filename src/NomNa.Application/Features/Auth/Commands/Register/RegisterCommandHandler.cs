using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Exceptions;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Features.Auth.DTOs;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Auth.Commands.Register;

public class RegisterCommandHandler : IRequestHandler<RegisterCommand, AuthResultDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IJwtService _jwtService;

    public RegisterCommandHandler(IApplicationDbContext context, IJwtService jwtService)
    {
        _context = context;
        _jwtService = jwtService;
    }

    public async Task<AuthResultDto> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        var emailLower = request.Email.Trim().ToLowerInvariant();
        var usernameLower = request.Username.Trim().ToLowerInvariant();

        if (await _context.Users.AnyAsync(u => u.Email == emailLower, cancellationToken))
        {
            throw new AppException("Email is already registered.");
        }

        if (await _context.Users.AnyAsync(u => u.Username == usernameLower, cancellationToken))
        {
            throw new AppException("Username is already taken.");
        }

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        var user = new User
        {
            Email = emailLower,
            Username = usernameLower,
            DisplayName = request.DisplayName.Trim(),
            PasswordHash = passwordHash,
            Status = UserStatus.Online
        };

        _context.Users.Add(user);

        // Generate tokens
        var (accessToken, expiresAt) = _jwtService.GenerateAccessToken(user.Id, user.Email, user.Username);
        var rawRefreshToken = _jwtService.GenerateRefreshToken();

        var refreshTokenEntity = new NomNa.Domain.Entities.RefreshToken
        {
            UserId = user.Id,
            TokenHash = BCrypt.Net.BCrypt.HashPassword(rawRefreshToken),
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        _context.RefreshTokens.Add(refreshTokenEntity);
        await _context.SaveChangesAsync(cancellationToken);

        var userDto = new UserDto(user.Id, user.Email, user.Username, user.DisplayName, user.AvatarUrl, user.Bio, user.Status);
        return new AuthResultDto(accessToken, rawRefreshToken, expiresAt, userDto);
    }
}
