using Microsoft.AspNetCore.SignalR;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Features.Notifications.DTOs;
using NomNa.Shared.Constants;
using NomNa.WebAPI.Hubs;

namespace NomNa.WebAPI.Services;

public class SignalRNotificationDispatcher : INotificationDispatcher
{
    private readonly IHubContext<ChatHub> _hubContext;
    private readonly ILogger<SignalRNotificationDispatcher> _logger;

    public SignalRNotificationDispatcher(
        IHubContext<ChatHub> hubContext,
        ILogger<SignalRNotificationDispatcher> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task DispatchAsync(NotificationDto notification, CancellationToken cancellationToken = default)
    {
        try
        {
            await _hubContext.Clients.User(notification.UserId.ToString())
                .SendAsync(SignalRConstants.Events.ReceiveNotification, notification, cancellationToken);
        }
        catch (Exception ex)
        {
            // Log or ignore if user is offline
            _logger.LogWarning(ex, "[SignalRNotificationDispatcher] Error dispatching notification to user {UserId}: {Message}", notification.UserId, ex.Message);
        }
    }
}
