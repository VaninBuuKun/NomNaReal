using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Exceptions;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Features.Messages.DTOs;

namespace NomNa.Application.Features.Messages.Queries.GetMessages;

public class GetMessagesQueryHandler : IRequestHandler<GetMessagesQuery, List<MessageDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetMessagesQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<List<MessageDto>> Handle(GetMessagesQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            throw new UnauthorizedException();

        // Optimized query: AsNoTracking + Index-friendly CreatedAt cursor + Direct projection
        var query = _context.Messages
            .AsNoTracking()
            .Where(m => m.ChannelId == request.ChannelId && m.DeletedAt == null);

        if (request.Before.HasValue)
        {
            query = query.Where(m => m.CreatedAt < request.Before.Value);
        }

        var limit = Math.Clamp(request.Limit, 1, 100);

        var messages = await query
            .OrderByDescending(m => m.CreatedAt)
            .Take(limit)
            .Select(m => new MessageDto(
                m.Id,
                m.ChannelId,
                m.SenderId,
                m.Sender.DisplayName,
                m.Sender.Username,
                m.Sender.AvatarUrl,
                m.Content,
                m.ThreadId,
                m.IsEdited,
                m.CreatedAt
            ))
            .ToListAsync(cancellationToken);

        // Reverse so client receives chronological order (oldest to newest)
        messages.Reverse();
        return messages;
    }
}
