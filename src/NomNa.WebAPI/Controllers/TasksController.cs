using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using NomNa.Application.Features.Tasks.Commands.CreateTask;
using NomNa.Application.Features.Tasks.Commands.DeleteTask;
using NomNa.Application.Features.Tasks.Commands.ToggleTaskStatus;
using NomNa.Application.Features.Tasks.Commands.UpdateTask;
using NomNa.Application.Features.Tasks.Queries.GetChannelTasks;
using NomNa.Domain.Enums;
using NomNa.Shared.Constants;
using NomNa.WebAPI.Hubs;

namespace NomNa.WebAPI.Controllers;

[Authorize]
[Route("api/[controller]")]
public class TasksController : ApiControllerBase
{
    private readonly IHubContext<ChatHub> _hubContext;

    public TasksController(IHubContext<ChatHub> hubContext)
    {
        _hubContext = hubContext;
    }

    [HttpGet("channel/{channelId:guid}")]
    public async Task<IActionResult> GetChannelTasks([FromRoute] Guid channelId)
    {
        var result = await Mediator.Send(new GetChannelTasksQuery(channelId));
        return HandleResult(result);
    }

    [HttpPost]
    public async Task<IActionResult> CreateTask([FromBody] CreateTaskRequest request)
    {
        var command = new CreateTaskCommand(
            request.ChannelId,
            request.Title,
            request.Note,
            request.AttachmentUrl,
            request.Priority,
            request.DueDate,
            request.AssigneeId,
            request.SourceMessageId
        );

        var result = await Mediator.Send(command);
        if (result.IsSuccess && result.Value != null)
        {
            var task = result.Value;
            var channelGroup = task.ChannelId.ToString();
            await _hubContext.Clients.Group(channelGroup).SendAsync(SignalRConstants.Events.TaskCreated, task);
        }

        return HandleResult(result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateTask(
        [FromRoute] Guid id,
        [FromBody] UpdateTaskRequest request)
    {
        var command = new UpdateTaskCommand(
            id,
            request.Title,
            request.Note,
            request.AttachmentUrl,
            request.Priority,
            request.DueDate,
            request.AssigneeId,
            request.CompletionNote
        );

        var result = await Mediator.Send(command);
        if (result.IsSuccess && result.Value != null)
        {
            var task = result.Value;
            var channelGroup = task.ChannelId.ToString();
            await _hubContext.Clients.Group(channelGroup).SendAsync(SignalRConstants.Events.TaskUpdated, task);
        }

        return HandleResult(result);
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> ToggleTaskStatus(
        [FromRoute] Guid id,
        [FromBody] ToggleTaskStatusRequest request)
    {
        var command = new ToggleTaskStatusCommand(id, request.TargetStatus, request.CompletionNote);
        var result = await Mediator.Send(command);
        if (result.IsSuccess && result.Value != null)
        {
            var task = result.Value;
            var channelGroup = task.ChannelId.ToString();
            await _hubContext.Clients.Group(channelGroup).SendAsync(SignalRConstants.Events.TaskStatusChanged, task);
        }

        return HandleResult(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteTask([FromRoute] Guid id, [FromQuery] Guid? channelId)
    {
        var result = await Mediator.Send(new DeleteTaskCommand(id));
        if (result.IsSuccess && channelId.HasValue)
        {
            var channelGroup = channelId.Value.ToString();
            await _hubContext.Clients.Group(channelGroup).SendAsync(SignalRConstants.Events.TaskDeleted, new { taskId = id });
        }

        return HandleResult(result);
    }
}

public record CreateTaskRequest(
    Guid ChannelId,
    string Title,
    string? Note,
    string? AttachmentUrl,
    TaskPriority Priority,
    DateTime? DueDate,
    Guid? AssigneeId,
    Guid? SourceMessageId
);

public record UpdateTaskRequest(
    string Title,
    string? Note,
    string? AttachmentUrl,
    TaskPriority Priority,
    DateTime? DueDate,
    Guid? AssigneeId,
    string? CompletionNote
);

public record ToggleTaskStatusRequest(
    TaskItemStatus? TargetStatus,
    string? CompletionNote
);
