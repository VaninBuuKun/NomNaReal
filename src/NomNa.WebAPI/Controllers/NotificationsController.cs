using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NomNa.Application.Features.Notifications.Commands.MarkAllNotificationsAsRead;
using NomNa.Application.Features.Notifications.Commands.MarkNotificationAsRead;
using NomNa.Application.Features.Notifications.Queries.GetNotifications;
using NomNa.Application.Features.Notifications.Queries.GetUnreadNotificationCount;

namespace NomNa.WebAPI.Controllers;

[Authorize]
[Route("api/[controller]")]
public class NotificationsController : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetNotifications(
        [FromQuery] string? filter = "all",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await Mediator.Send(new GetNotificationsQuery(filter, page, pageSize));
        return HandleResult(result);
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var result = await Mediator.Send(new GetUnreadNotificationCountQuery());
        return HandleResult(result);
    }

    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead([FromRoute] Guid id)
    {
        var result = await Mediator.Send(new MarkNotificationAsReadCommand(id));
        return HandleResult(result);
    }

    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllAsRead([FromQuery] string? filter = null)
    {
        var result = await Mediator.Send(new MarkAllNotificationsAsReadCommand(filter));
        return HandleResult(result);
    }
}
