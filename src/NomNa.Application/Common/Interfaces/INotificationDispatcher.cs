using NomNa.Application.Features.Notifications.DTOs;

namespace NomNa.Application.Common.Interfaces;

public interface INotificationDispatcher
{
    Task DispatchAsync(NotificationDto notification, CancellationToken cancellationToken = default);
}
