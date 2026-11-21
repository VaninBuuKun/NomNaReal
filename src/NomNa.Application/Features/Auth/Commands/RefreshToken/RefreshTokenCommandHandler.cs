using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Auth.DTOs;


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

        // OAuth 2.0 BCP (RFC 6819): Detect reuse of already revoked refresh token.
        // If an attacker attempts to replay an old token, revoke the entire token family immediately.
        if (matchingToken != null && matchingToken.RevokedAt != null && matchingToken.User != null)
        {
            var compromisedUserId = matchingToken.UserId;
            var activeTokens = await _context.RefreshTokens
                .Where(t => t.UserId == compromisedUserId && t.RevokedAt == null)
                .ToListAsync(cancellationToken);

            var nowUtc = DateTime.UtcNow;
            foreach (var activeToken in activeTokens)
            {
                activeToken.RevokedAt = nowUtc;
            }

            await _context.SaveChangesAsync(cancellationToken);

            return Error.Unauthorized("Auth.TokenCompromised", "Security violation: Reused refresh token detected. All active sessions have been terminated.");
        }

        if (matchingToken == null || !matchingToken.IsActive || matchingToken.User == null)
            return Error.Unauthorized("Auth.InvalidToken", "Invalid or expired refresh token.");

        var user = matchingToken.User;

        // Revoke old token (Rotation)
        matchingToken.RevokedAt = DateTime.UtcNow;

        // Generate new token pair
        var (accessToken, expiresAt) = _jwtService.GenerateAccessToken(user.Id, user.Email ?? string.Empty, user.UserName ?? string.Empty);
        var newRawRefreshToken = _jwtService.GenerateRefreshToken();

        var newRefreshTokenEntity = new Domain.Entities.RefreshToken()
        {
            UserId = user.Id,
            TokenHash = _jwtService.HashToken(newRawRefreshToken),
            ExpiresAt = DateTime.UtcNow.AddDays(NomNa.Shared.Constants.AuthConstants.RefreshTokenExpirationDays)
        };

        _context.RefreshTokens.Add(newRefreshTokenEntity);
        await _context.SaveChangesAsync(cancellationToken);

        var userDto = new UserDto(user.Id, user.Email ?? string.Empty, user.UserName ?? string.Empty, user.DisplayName, user.AvatarUrl, user.Bio, user.StatusPreference);
        return new AuthResultDto(accessToken, newRawRefreshToken, expiresAt, userDto);
    }
}
