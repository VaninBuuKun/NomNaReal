using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Channels.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Channels.Queries.GetChannels;

public class GetChannelsQueryHandler : IRequestHandler<GetChannelsQuery, Result<List<ChannelDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetChannelsQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<List<ChannelDto>>> Handle(GetChannelsQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        // Check if user is a member of this workspace
        var isMember = await _context.WorkspaceMembers
            .AnyAsync(wm => wm.WorkspaceId == request.WorkspaceId && wm.UserId == userId.Value, cancellationToken);

        if (!isMember)
            return Error.Forbidden("Workspace.Forbidden", "You are not a member of this workspace.");


        // Avoid N+1 queries: c.Members.Any translates to EXISTS (SELECT 1 FROM ChannelMembers ...) in SQL
        // Exists in Sql where statment:  
        return await _context.Channels
            .AsNoTracking()
            .Where(c => c.WorkspaceId == request.WorkspaceId 
                     && c.Type != ChannelType.DirectMessage
                     && (!c.IsPrivate || c.Members.Any(m => m.UserId == userId.Value)))
            .OrderBy(c => c.CreatedAt)
            .Select(c => new ChannelDto(
                c.Id,
                c.WorkspaceId,
                c.Name,
                c.Type,
                c.IsPrivate,
                c.LastMessageAt,
                c.LastMessageAt != null && (
                    c.Members.Where(m => m.UserId == userId.Value).Select(m => m.LastReadAt).FirstOrDefault() == null ||
                    c.LastMessageAt > c.Members.Where(m => m.UserId == userId.Value).Select(m => m.LastReadAt).FirstOrDefault()
                )
            ))
            .ToListAsync(cancellationToken);
    }
}
