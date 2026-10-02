using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Notifications.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Notifications.Queries.GetUnreadNotificationCount;

public class GetUnreadNotificationCountQueryHandler : IRequestHandler<GetUnreadNotificationCountQuery, Result<UnreadNotificationCountDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetUnreadNotificationCountQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<UnreadNotificationCountDto>> Handle(GetUnreadNotificationCountQuery request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        if (!currentUserId.HasValue)
        {
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");
        }

        var unreadQuery = _context.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == currentUserId.Value && !n.IsRead);

        var totalUnread = await unreadQuery.CountAsync(cancellationToken);
        var mentionUnread = await unreadQuery.CountAsync(n => n.Type == NotificationType.Mention, cancellationToken);

        return new UnreadNotificationCountDto(totalUnread, mentionUnread);
    }
}
