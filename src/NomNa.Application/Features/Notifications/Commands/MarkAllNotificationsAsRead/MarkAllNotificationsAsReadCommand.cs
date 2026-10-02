using MediatR;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Notifications.Commands.MarkAllNotificationsAsRead;

public record MarkAllNotificationsAsReadCommand(string? Filter = null) : IRequest<Result<int>>;
