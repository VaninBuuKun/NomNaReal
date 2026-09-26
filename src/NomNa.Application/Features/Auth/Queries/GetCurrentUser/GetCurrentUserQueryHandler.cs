using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Exceptions;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Features.Auth.DTOs;

namespace NomNa.Application.Features.Auth.Queries.GetCurrentUser;

public class GetCurrentUserQueryHandler : IRequestHandler<GetCurrentUserQuery, UserDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetCurrentUserQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<UserDto> Handle(GetCurrentUserQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            throw new UnauthorizedException("User is not authenticated.");

        var user = await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == userId.Value)
            .Select(u => new UserDto(
                u.Id,
                u.Email,
                u.Username,
                u.DisplayName,
                u.AvatarUrl,
                u.Bio,
                u.Status
            ))
            .FirstOrDefaultAsync(cancellationToken);

        if (user == null)
            throw new NotFoundException("User", userId.Value);

        return user;
    }
}
