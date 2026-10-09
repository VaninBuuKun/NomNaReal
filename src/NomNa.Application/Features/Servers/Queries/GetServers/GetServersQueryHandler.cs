using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Servers.DTOs;

namespace NomNa.Application.Features.Servers.Queries.GetServers;

public class GetServersQueryHandler : IRequestHandler<GetServersQuery, Result<List<ServerDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetServersQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<List<ServerDto>>> Handle(GetServersQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        return await _context.ServerMembers
            .AsNoTracking()
            .Where(wm => wm.UserId == userId.Value)
            .Select(wm => new ServerDto(
                wm.Server.Id,
                wm.Server.Name,
                wm.Server.Description,
                wm.Server.IconUrl,
                wm.Server.InviteCode,
                wm.Server.OwnerId,
                wm.Server.Members.Count
            ))
            .ToListAsync(cancellationToken);
    }
}
