using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Tasks.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Tasks.Commands.UpdateTask;

public class UpdateTaskCommandHandler : IRequestHandler<UpdateTaskCommand, Result<TaskItemDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public UpdateTaskCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<TaskItemDto>> Handle(UpdateTaskCommand request, CancellationToken cancellationToken)
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

        if (!isCreator && !isAssignee && !isManager)
        {
            return Error.Forbidden("Task.Forbidden", "Bạn không có quyền chỉnh sửa công việc này.");
        }

        // If user is manager or creator -> full edit
        if (isCreator || isManager)
        {
            if (request.AssigneeId.HasValue && request.AssigneeId.Value != task.AssigneeId)
            {
                var isAssigneeInWorkspace = await _context.WorkspaceMembers
                    .AnyAsync(wm => wm.WorkspaceId == task.WorkspaceId && wm.UserId == request.AssigneeId.Value, cancellationToken);

                if (!isAssigneeInWorkspace)
                {
                    return Error.NotFound("Assignee.NotFound", "Người được giao không thuộc không gian làm việc này.");
                }
                task.AssigneeId = request.AssigneeId;
            }
            else if (!request.AssigneeId.HasValue)
            {
                task.AssigneeId = null;
            }

            task.Title = request.Title.Trim();
            task.Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
            task.AttachmentUrl = string.IsNullOrWhiteSpace(request.AttachmentUrl) ? null : request.AttachmentUrl.Trim();
            task.Priority = request.Priority;
            task.DueDate = request.DueDate;
        }

        // Both assignee and creator/manager can update completion note / feedback
        task.CompletionNote = string.IsNullOrWhiteSpace(request.CompletionNote) ? null : request.CompletionNote.Trim();

        await _context.SaveChangesAsync(cancellationToken);

        // Reload assignee if changed
        TaskMemberSummaryDto? assigneeSummary = null;
        if (task.AssigneeId.HasValue)
        {
            var assigneeUser = await _context.Users
                .Where(u => u.Id == task.AssigneeId.Value)
                .Select(u => new TaskMemberSummaryDto(u.Id, u.DisplayName, u.UserName, u.AvatarUrl))
                .FirstOrDefaultAsync(cancellationToken);
            assigneeSummary = assigneeUser;
        }

        var creatorSummary = new TaskMemberSummaryDto(
            task.Creator.Id,
            task.Creator.DisplayName,
            task.Creator.UserName,
            task.Creator.AvatarUrl
        );

        return new TaskItemDto(
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
            assigneeSummary,
            creatorSummary
        );
    }
}
