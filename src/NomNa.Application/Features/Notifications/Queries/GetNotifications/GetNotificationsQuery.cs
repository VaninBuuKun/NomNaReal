using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Notifications.DTOs;

namespace NomNa.Application.Features.Notifications.Queries.GetNotifications;

public record GetNotificationsQuery(
    string? Filter = "all", // "all", "unread", "mention"
    int Page = 1,
    int PageSize = 20
) : IRequest<Result<List<NotificationDto>>>;
