using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Notifications.DTOs;

namespace NomNa.Application.Features.Notifications.Queries.GetUnreadNotificationCount;

public record GetUnreadNotificationCountQuery() : IRequest<Result<UnreadNotificationCountDto>>;
