using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NomNa.Application.Features.Channels.Commands.CreateChannel;
using NomNa.Application.Features.Channels.DTOs;
using NomNa.Application.Features.Channels.Queries.GetChannels;
using NomNa.Application.Features.Workspaces.Commands.CreateWorkspace;
using NomNa.Application.Features.Workspaces.DTOs;
using NomNa.Application.Features.Workspaces.Queries.GetWorkspaces;

namespace NomNa.WebAPI.Controllers;

[Authorize]
public class WorkspacesController : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<WorkspaceDto>>> GetWorkspaces()
    {
        var result = await Mediator.Send(new GetWorkspacesQuery());
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<WorkspaceDto>> CreateWorkspace([FromBody] CreateWorkspaceCommand command)
    {
        var result = await Mediator.Send(command);
        return CreatedAtAction(nameof(GetWorkspaces), new { id = result.Id }, result);
    }

    [HttpGet("{workspaceId}/channels")]
    public async Task<ActionResult<List<ChannelDto>>> GetChannels([FromRoute] Guid workspaceId)
    {
        var result = await Mediator.Send(new GetChannelsQuery(workspaceId));
        return Ok(result);
    }

    [HttpPost("{workspaceId}/channels")]
    public async Task<ActionResult<ChannelDto>> CreateChannel([FromRoute] Guid workspaceId, [FromBody] CreateChannelRequest request)
    {
        var command = new CreateChannelCommand(workspaceId, request.Name, request.Topic, request.Type, request.IsPrivate);
        var result = await Mediator.Send(command);
        return Ok(result);
    }
}

public record CreateChannelRequest(string Name, string? Topic, Domain.Enums.ChannelType Type = Domain.Enums.ChannelType.Text, bool IsPrivate = false);
