using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Auth.DTOs;

namespace NomNa.Application.Features.Auth.Commands.UpdateProfile;

public class UpdateProfileCommandHandler : IRequestHandler<UpdateProfileCommand, Result<UserDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IUserProfileCache _userProfileCache;

    public UpdateProfileCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IUserProfileCache userProfileCache)
    {
        _context = context;
        _currentUserService = currentUserService;
        _userProfileCache = userProfileCache;
    }

    public async Task<Result<UserDto>> Handle(UpdateProfileCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId.Value, cancellationToken);

        if (user == null)
            return Error.NotFound("User.NotFound", $"User {userId.Value} not found.");

        if (request.DisplayName != null)
        {
            user.DisplayName = request.DisplayName.Trim();
        }

        if (request.AvatarUrl != null)
        {
            user.AvatarUrl = string.IsNullOrWhiteSpace(request.AvatarUrl) ? null : request.AvatarUrl.Trim();
        }

        if (request.Bio != null)
        {
            user.Bio = request.Bio.Trim();
        }

        await _context.SaveChangesAsync(cancellationToken);

        _userProfileCache.Set(new UserProfileDto(
            user.Id,
            user.DisplayName,
            user.UserName ?? string.Empty,
            user.AvatarUrl
        ));

        return new UserDto(
            user.Id,
            user.Email ?? string.Empty,
            user.UserName ?? string.Empty,
            user.DisplayName,
            user.AvatarUrl,
            user.Bio,
            user.Status
        );
    }
}
