using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Auth.DTOs;
using NomNa.Domain.Entities;

namespace NomNa.Application.Features.Auth.Commands.RefreshToken;

public class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, Result<AuthResultDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IJwtService _jwtService;

    public RefreshTokenCommandHandler(IApplicationDbContext context, IJwtService jwtService)
    {
        _context = context;
        _jwtService = jwtService;
    }

    public async Task<Result<AuthResultDto>> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            return Error.Unauthorized("Auth.InvalidToken", "Refresh token is missing.");

        var tokenHash = _jwtService.HashToken(request.RefreshToken);

        // High-performance direct single-row query using indexed TokenHash
        var matchingToken = await _context.RefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash, cancellationToken);

        // Fallback for any legacy BCrypt tokens if not found by SHA256
        if (matchingToken == null && request.UserId != Guid.Empty)
        {
            var userTokens = await _context.RefreshTokens
                .Include(t => t.User)
                .Where(t => t.UserId == request.UserId && t.RevokedAt == null && t.ExpiresAt > DateTime.UtcNow)
                .ToListAsync(cancellationToken);

            matchingToken = userTokens.FirstOrDefault(t => t.TokenHash.StartsWith("$2") && BCrypt.Net.BCrypt.Verify(request.RefreshToken, t.TokenHash));
        }

        if (matchingToken == null || !matchingToken.IsActive || matchingToken.User == null)
            return Error.Unauthorized("Auth.InvalidToken", "Invalid or expired refresh token.");

        var user = matchingToken.User;

        // Revoke old token (Rotation)
        matchingToken.RevokedAt = DateTime.UtcNow;

        // Generate new token pair
        var (accessToken, expiresAt) = _jwtService.GenerateAccessToken(user.Id, user.Email ?? string.Empty, user.Username);
        var newRawRefreshToken = _jwtService.GenerateRefreshToken();

        var newRefreshTokenEntity = new NomNa.Domain.Entities.RefreshToken
        {
            UserId = user.Id,
            TokenHash = _jwtService.HashToken(newRawRefreshToken),
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        _context.RefreshTokens.Add(newRefreshTokenEntity);
        await _context.SaveChangesAsync(cancellationToken);

        var userDto = new UserDto(user.Id, user.Email ?? string.Empty, user.Username, user.DisplayName, user.AvatarUrl, user.Bio, user.Status);
        return new AuthResultDto(accessToken, newRawRefreshToken, expiresAt, userDto);
    }
}
