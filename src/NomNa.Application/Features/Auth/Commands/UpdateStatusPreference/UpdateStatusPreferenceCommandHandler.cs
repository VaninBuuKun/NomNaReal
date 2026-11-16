using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Auth.Commands.UpdateStatusPreference;

/// <summary>
/// Handler updating the user's status preference in persistent storage.
/// </summary>
public class UpdateStatusPreferenceCommandHandler : IRequestHandler<UpdateStatusPreferenceCommand, Result<Unit>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public UpdateStatusPreferenceCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<Unit>> Handle(UpdateStatusPreferenceCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId.Value, cancellationToken);
        if (user == null)
            return Error.NotFound("User.NotFound", $"User {userId.Value} not found.");

        user.UpdateStatusPreference(request.Preference);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<Unit>.Success(Unit.Value);
    }
}
