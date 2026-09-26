using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NomNa.Application.Features.Messages.Commands.SendMessage;
using NomNa.Application.Features.Messages.DTOs;
using NomNa.Application.Features.Messages.Queries.GetMessages;

namespace NomNa.WebAPI.Controllers;

[Authorize]
[Route("api/[controller]")]
public class ChannelsController : ApiControllerBase
{
    [HttpGet("{channelId}/messages")]
    public async Task<IActionResult> GetMessages(
        [FromRoute] Guid channelId,
        [FromQuery] DateTime? before,
        [FromQuery] int limit = 50)
    {
        var result = await Mediator.Send(new GetMessagesQuery(channelId, before, limit));
        return HandleResult(result);
    }

    [HttpPost("{channelId}/messages")]
    public async Task<IActionResult> SendMessage(
        [FromRoute] Guid channelId,
        [FromBody] SendMessageRequest request)
    {
        var result = await Mediator.Send(new SendMessageCommand(channelId, request.Content, request.ThreadId));
        return HandleResult(result);
    }
}

public record SendMessageRequest(string Content, Guid? ThreadId = null);
