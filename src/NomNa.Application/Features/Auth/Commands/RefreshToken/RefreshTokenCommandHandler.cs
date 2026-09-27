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


        if (matchingToken == null || !matchingToken.IsActive || matchingToken.User == null)
            return Error.Unauthorized("Auth.InvalidToken", "Invalid or expired refresh token.");

        var user = matchingToken.User;

        // Revoke old token (Rotation)
        matchingToken.RevokedAt = DateTime.UtcNow;

        // Generate new token pair
        var (accessToken, expiresAt) = _jwtService.GenerateAccessToken(user.Id, user.Email ?? string.Empty, user.UserName);
        var newRawRefreshToken = _jwtService.GenerateRefreshToken();

        var newRefreshTokenEntity = new Domain.Entities.RefreshToken()
        {
            UserId = user.Id,
            TokenHash = _jwtService.HashToken(newRawRefreshToken),
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        _context.RefreshTokens.Add(newRefreshTokenEntity);
        await _context.SaveChangesAsync(cancellationToken);

        var userDto = new UserDto(user.Id, user.Email ?? string.Empty, user.UserName, user.DisplayName, user.AvatarUrl, user.Bio, user.Status);
        return new AuthResultDto(accessToken, newRawRefreshToken, expiresAt, userDto);
    }
}
