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
    public async Task<IActionResult> GetWorkspaces()
    {
        var result = await Mediator.Send(new GetWorkspacesQuery());
        return HandleResult(result);
    }

    [HttpPost]
    public async Task<IActionResult> CreateWorkspace([FromBody] CreateWorkspaceCommand command)
    {
        var result = await Mediator.Send(command);
        if (result.IsSuccess)
        {
            return CreatedAtAction(nameof(GetWorkspaces), new { id = result.Value!.Id }, result.Value);
        }
        return HandleResult(result);
    }

    [HttpPost("join")]
    public async Task<IActionResult> JoinWorkspace([FromBody] NomNa.Application.Features.Workspaces.Commands.JoinWorkspace.JoinWorkspaceCommand command)
    {
        var result = await Mediator.Send(command);
        return HandleResult(result);
    }

    [AllowAnonymous]
    [HttpGet("invite/{inviteCode}")]
    public async Task<IActionResult> GetWorkspaceByInviteCode([FromRoute] string inviteCode)
    {
        var result = await Mediator.Send(new NomNa.Application.Features.Workspaces.Queries.GetWorkspaceByInviteCode.GetWorkspaceByInviteCodeQuery(inviteCode));
        return HandleResult(result);
    }

    [HttpGet("{workspaceId}/channels")]
    public async Task<IActionResult> GetChannels([FromRoute] Guid workspaceId)
    {
        var result = await Mediator.Send(new GetChannelsQuery(workspaceId));
        return HandleResult(result);
    }

    [HttpPost("{workspaceId}/channels")]
    public async Task<IActionResult> CreateChannel([FromRoute] Guid workspaceId, [FromBody] CreateChannelRequest request)
    {
        var command = new CreateChannelCommand(workspaceId, request.Name, request.Type, request.IsPrivate);
        var result = await Mediator.Send(command);
        return HandleResult(result);
    }

    [HttpGet("{workspaceId}/members")]
    public async Task<IActionResult> GetMembers([FromRoute] Guid workspaceId)
    {
        var result = await Mediator.Send(new NomNa.Application.Features.Workspaces.Queries.GetWorkspaceMembers.GetWorkspaceMembersQuery(workspaceId));
        return HandleResult(result);
    }

    [HttpGet("{workspaceId}/dm")]
    public async Task<IActionResult> GetDirectMessages([FromRoute] Guid workspaceId)
    {
        var result = await Mediator.Send(new NomNa.Application.Features.Channels.Queries.GetDirectMessages.GetDirectMessagesQuery(workspaceId));
        return HandleResult(result);
    }

    [HttpPost("{workspaceId}/dm")]
    public async Task<IActionResult> CreateOrGetDm([FromRoute] Guid workspaceId, [FromBody] CreateDmRequest request)
    {
        var command = new Application.Features.Channels.Commands.CreateOrGetDmChannel.CreateOrGetDmChannelCommand(workspaceId, request.TargetUserId);
        var result = await Mediator.Send(command);
        return HandleResult(result);
    }

    [HttpPost("{workspaceId}/invite-emails")]
    public async Task<IActionResult> SendEmailInvites([FromRoute] Guid workspaceId, [FromBody] SendWorkspaceInvitesRequest request)
    {
        var command = new NomNa.Application.Features.Workspaces.Commands.SendWorkspaceInvites.SendWorkspaceInvitesCommand(workspaceId, request.Emails);
        var result = await Mediator.Send(command);
        return HandleResult(result);
    }
}

public record CreateChannelRequest(string Name, Domain.Enums.ChannelType Type = Domain.Enums.ChannelType.Text, bool IsPrivate = false);
public record CreateDmRequest(Guid TargetUserId);
public record SendWorkspaceInvitesRequest(List<string> Emails);

