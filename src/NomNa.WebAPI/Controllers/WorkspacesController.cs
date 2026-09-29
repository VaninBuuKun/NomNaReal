using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using NomNa.Application.Features.Channels.Commands.CreateChannel;
using NomNa.Application.Features.Channels.DTOs;
using NomNa.Application.Features.Channels.Queries.GetChannels;
using NomNa.Application.Features.Workspaces.Commands.CreateWorkspace;
using NomNa.Application.Features.Workspaces.DTOs;
using NomNa.Application.Features.Workspaces.Queries.GetWorkspaces;
using NomNa.Shared.Constants;
using NomNa.WebAPI.Hubs;

namespace NomNa.WebAPI.Controllers;

[Authorize]
public class WorkspacesController : ApiControllerBase
{
    private readonly IHubContext<ChatHub> _hubContext;

    public WorkspacesController(IHubContext<ChatHub> hubContext)
    {
        _hubContext = hubContext;
    }

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
        if (result.IsSuccess && result.Value != null)
        {
            var res = result.Value;

            if (res.NewMember != null)
            {
                await _hubContext.Clients.All.SendAsync(SignalRConstants.Events.WorkspaceMemberJoined, new
                {
                    workspaceId = res.Workspace.Id,
                    member = res.NewMember,
                    memberCount = res.Workspace.MemberCount
                });
            }

            if (res.WelcomeMessage != null)
            {
                await _hubContext.Clients.Group(res.WelcomeMessage.ChannelId.ToString())
                    .SendAsync(SignalRConstants.Events.ReceiveMessage, res.WelcomeMessage);
            }

            return Ok(res.Workspace);
        }
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

    [HttpPut("{workspaceId}")]
    public async Task<IActionResult> UpdateWorkspace([FromRoute] Guid workspaceId, [FromBody] UpdateWorkspaceRequest request)
    {
        var command = new NomNa.Application.Features.Workspaces.Commands.UpdateWorkspace.UpdateWorkspaceCommand(
            workspaceId, request.Name, request.Description, request.IconUrl);
        var result = await Mediator.Send(command);
        return HandleResult(result);
    }

    [HttpDelete("{workspaceId}")]
    public async Task<IActionResult> DeleteWorkspace([FromRoute] Guid workspaceId)
    {
        var command = new NomNa.Application.Features.Workspaces.Commands.DeleteWorkspace.DeleteWorkspaceCommand(workspaceId);
        var result = await Mediator.Send(command);
        return HandleResult(result);
    }

    [HttpPost("{workspaceId}/leave")]
    public async Task<IActionResult> LeaveWorkspace([FromRoute] Guid workspaceId)
    {
        var command = new NomNa.Application.Features.Workspaces.Commands.LeaveWorkspace.LeaveWorkspaceCommand(workspaceId);
        var result = await Mediator.Send(command);
        return HandleResult(result);
    }

    [HttpDelete("{workspaceId}/members/{memberUserId}")]
    public async Task<IActionResult> KickMember([FromRoute] Guid workspaceId, [FromRoute] Guid memberUserId)
    {
        var command = new NomNa.Application.Features.Workspaces.Commands.KickWorkspaceMember.KickWorkspaceMemberCommand(workspaceId, memberUserId);
        var result = await Mediator.Send(command);
        return HandleResult(result);
    }
}

public record CreateChannelRequest(string Name, Domain.Enums.ChannelType Type = Domain.Enums.ChannelType.Text, bool IsPrivate = false);
public record CreateDmRequest(Guid TargetUserId);
public record SendWorkspaceInvitesRequest(List<string> Emails);
public record UpdateWorkspaceRequest(string Name, string? Description = null, string? IconUrl = null);

