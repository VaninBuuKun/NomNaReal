using MediatR;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Notifications.Commands.MarkNotificationAsRead;

public record MarkNotificationAsReadCommand(Guid NotificationId) : IRequest<Result<bool>>;
