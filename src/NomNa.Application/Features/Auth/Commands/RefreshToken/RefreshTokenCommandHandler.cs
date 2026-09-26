using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Exceptions;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Features.Auth.DTOs;
using NomNa.Domain.Entities;

namespace NomNa.Application.Features.Auth.Commands.RefreshToken;

public class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, AuthResultDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IJwtService _jwtService;

    public RefreshTokenCommandHandler(IApplicationDbContext context, IJwtService jwtService)
    {
        _context = context;
        _jwtService = jwtService;
    }

    public async Task<AuthResultDto> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .Include(u => u.RefreshTokens)
            .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

        if (user == null)
            throw new UnauthorizedException("User not found.");

        var activeTokens = user.RefreshTokens.Where(t => t.IsActive).ToList();
        var matchingToken = activeTokens.FirstOrDefault(t => BCrypt.Net.BCrypt.Verify(request.RefreshToken, t.TokenHash));

        if (matchingToken == null)
            throw new UnauthorizedException("Invalid or expired refresh token.");

        // Revoke old token
        matchingToken.RevokedAt = DateTime.UtcNow;

        // Generate new token pair (rotation)
        var (accessToken, expiresAt) = _jwtService.GenerateAccessToken(user.Id, user.Email, user.Username);
        var newRawRefreshToken = _jwtService.GenerateRefreshToken();

        var newRefreshTokenEntity = new NomNa.Domain.Entities.RefreshToken
        {
            UserId = user.Id,
            TokenHash = BCrypt.Net.BCrypt.HashPassword(newRawRefreshToken),
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        _context.RefreshTokens.Add(newRefreshTokenEntity);
        await _context.SaveChangesAsync(cancellationToken);

        var userDto = new UserDto(user.Id, user.Email, user.Username, user.DisplayName, user.AvatarUrl, user.Bio, user.Status);
        return new AuthResultDto(accessToken, newRawRefreshToken, expiresAt, userDto);
    }
}
