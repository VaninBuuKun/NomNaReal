using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Domain.Entities;

namespace NomNa.Application.Features.Auth.Commands.ChangePassword;

public class ChangePasswordCommandHandler : IRequestHandler<ChangePasswordCommand, Result>
{
    private readonly UserManager<User> _userManager;
    private readonly ICurrentUserService _currentUserService;
    private readonly IApplicationDbContext _context;

    public ChangePasswordCommandHandler(
        UserManager<User> userManager,
        ICurrentUserService currentUserService,
        IApplicationDbContext context)
    {
        _userManager = userManager;
        _currentUserService = currentUserService;
        _context = context;
    }

    public async Task<Result> Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
        {
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");
        }

        var user = await _userManager.FindByIdAsync(userId.Value.ToString());
        if (user == null)
        {
            return Error.NotFound("User.NotFound", "User not found.");
        }

        var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
        {
            var errorMessage = result.Errors.FirstOrDefault()?.Description ?? "Failed to change password.";
            return Error.Validation("Auth.ChangePasswordFailed", errorMessage);
        }

        // Revoke all existing active refresh tokens upon password change for security
        var activeTokens = await _context.RefreshTokens
            .Where(t => t.UserId == user.Id && t.RevokedAt == null)
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        foreach (var t in activeTokens)
        {
            t.RevokedAt = now;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
