using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Tasks.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Tasks.Commands.ToggleTaskStatus;

public class ToggleTaskStatusCommandHandler : IRequestHandler<ToggleTaskStatusCommand, Result<TaskItemDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public ToggleTaskStatusCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<TaskItemDto>> Handle(ToggleTaskStatusCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        if (!currentUserId.HasValue)
        {
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");
        }

        var task = await _context.Tasks
            .Include(t => t.Creator)
            .Include(t => t.Assignee)
            .FirstOrDefaultAsync(t => t.Id == request.TaskId, cancellationToken);

        if (task == null)
        {
            return Error.NotFound("Task.NotFound", "Công việc không tồn tại.");
        }

        var memberRole = await _context.WorkspaceMembers
            .Where(wm => wm.WorkspaceId == task.WorkspaceId && wm.UserId == currentUserId.Value)
            .Select(wm => (WorkspaceRole?)wm.Role)
            .FirstOrDefaultAsync(cancellationToken);

        if (!memberRole.HasValue)
        {
            return Error.Forbidden("Workspace.Forbidden", "Bạn không phải thành viên của không gian làm việc này.");
        }

        var isCreator = task.CreatedById == currentUserId.Value;
        var isAssignee = task.AssigneeId.HasValue && task.AssigneeId.Value == currentUserId.Value;
        var isManager = memberRole.Value == WorkspaceRole.Owner || memberRole.Value == WorkspaceRole.Admin;
        var isUnassigned = !task.AssigneeId.HasValue;

        // If task is assigned to someone specific, only assignee, creator, or managers can toggle
        if (!isUnassigned && !isAssignee && !isCreator && !isManager)
        {
            return Error.Forbidden("Task.Forbidden", "Chỉ người thực hiện, người giao hoặc quản trị viên mới có thể cập nhật trạng thái.");
        }

        // Determine new status
        TaskItemStatus nextStatus;
        if (request.TargetStatus.HasValue)
        {
            nextStatus = request.TargetStatus.Value;
        }
        else
        {
            // Toggle between Done and Todo
            nextStatus = task.Status == TaskItemStatus.Done ? TaskItemStatus.Todo : TaskItemStatus.Done;
        }

        task.Status = nextStatus;
        if (nextStatus == TaskItemStatus.Done)
        {
            task.CompletedAt = DateTime.UtcNow;
            if (!string.IsNullOrWhiteSpace(request.CompletionNote))
            {
                task.CompletionNote = request.CompletionNote.Trim();
            }
        }
        else
        {
            task.CompletedAt = null;
        }

        await _context.SaveChangesAsync(cancellationToken);

        var dto = new TaskItemDto(
            task.Id,
            task.WorkspaceId,
            task.ChannelId,
            task.Title,
            task.Note,
            task.AttachmentUrl,
            task.CompletionNote,
            task.Status,
            task.Priority,
            task.DueDate,
            task.CompletedAt,
            task.CreatedById,
            task.AssigneeId,
            task.SourceMessageId,
            task.CreatedAt,
            task.UpdatedAt,
            task.Assignee != null
                ? new TaskMemberSummaryDto(
                    task.Assignee.Id,
                    task.Assignee.DisplayName,
                    task.Assignee.UserName,
                    task.Assignee.AvatarUrl)
                : null,
            new TaskMemberSummaryDto(
                task.Creator.Id,
                task.Creator.DisplayName,
                task.Creator.UserName,
                task.Creator.AvatarUrl)
        );

        return dto;
    }
}
