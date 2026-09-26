using MediatR;
using Microsoft.EntityFrameworkCore;
using PulseChat.Application.Common.Exceptions;
using PulseChat.Application.Common.Interfaces;
using PulseChat.Application.Features.Channels.DTOs;

namespace PulseChat.Application.Features.Channels.Queries.GetChannels;

public record GetChannelsQuery(Guid WorkspaceId) : IRequest<List<ChannelDto>>;

public class GetChannelsQueryHandler : IRequestHandler<GetChannelsQuery, List<ChannelDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetChannelsQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<List<ChannelDto>> Handle(GetChannelsQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            throw new UnauthorizedException();

        // Check if user is a member of this workspace
        var isMember = await _context.WorkspaceMembers
            .AnyAsync(wm => wm.WorkspaceId == request.WorkspaceId && wm.UserId == userId.Value, cancellationToken);

        if (!isMember)
            throw new UnauthorizedException("You are not a member of this workspace.");

        return await _context.Channels
            .AsNoTracking()
            .Where(c => c.WorkspaceId == request.WorkspaceId)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new ChannelDto(
                c.Id,
                c.WorkspaceId,
                c.Name,
                c.Topic,
                c.Type,
                c.IsPrivate
            ))
            .ToListAsync(cancellationToken);
    }
}
