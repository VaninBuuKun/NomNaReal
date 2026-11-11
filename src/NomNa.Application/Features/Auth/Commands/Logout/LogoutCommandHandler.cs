using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Auth.Commands.Logout;

public class LogoutCommandHandler : IRequestHandler<LogoutCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly IJwtService _jwtService;

    public LogoutCommandHandler(IApplicationDbContext context, IJwtService jwtService)
    {
        _context = context;
        _jwtService = jwtService;
    }

    public async Task<Result> Handle(LogoutCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return Result.Success();
        }

        var tokenHash = _jwtService.HashToken(request.RefreshToken);

        var token = await _context.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash, cancellationToken);

        if (token != null)
        {
            var now = DateTime.UtcNow;

            if (request.RevokeAllDevices)
            {
                var userActiveTokens = await _context.RefreshTokens
                    .Where(t => t.UserId == token.UserId && t.RevokedAt == null)
                    .ToListAsync(cancellationToken);

                foreach (var t in userActiveTokens)
                {
                    t.RevokedAt = now;
                }
            }
            else
            {
                token.RevokedAt = now;
            }

            await _context.SaveChangesAsync(cancellationToken);
        }

        return Result.Success();
    }
}
