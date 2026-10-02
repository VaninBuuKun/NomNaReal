using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Notifications.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Notifications.Queries.GetNotifications;

public class GetNotificationsQueryHandler : IRequestHandler<GetNotificationsQuery, Result<List<NotificationDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetNotificationsQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<List<NotificationDto>>> Handle(GetNotificationsQuery request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        if (!currentUserId.HasValue)
        {
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");
        }

        var query = _context.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == currentUserId.Value);

        var filter = (request.Filter ?? "all").Trim().ToLowerInvariant();
        if (filter == "unread")
        {
            query = query.Where(n => !n.IsRead);
        }
        else if (filter == "mention" || filter == "mentions")
        {
            query = query.Where(n => n.Type == NotificationType.Mention);
        }

        var page = request.Page < 1 ? 1 : request.Page;
        var pageSize = request.PageSize < 1 ? 20 : (request.PageSize > 50 ? 50 : request.PageSize);

        var notifications = await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new NotificationDto(
                n.Id,
                n.UserId,
                n.ActorId,
                n.Actor != null ? n.Actor.DisplayName : null,
                n.Actor != null ? n.Actor.UserName : null,
                n.Actor != null ? n.Actor.AvatarUrl : null,
                n.WorkspaceId,
                n.Workspace != null ? n.Workspace.Name : null,
                n.ChannelId,
                n.Channel != null ? n.Channel.Name : null,
                n.MessageId,
                n.Type,
                n.Title,
                n.Content,
                n.IsRead,
                n.CreatedAt
            ))
            .ToListAsync(cancellationToken);

        return notifications;
    }
}
