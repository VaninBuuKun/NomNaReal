using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Tasks.DTOs;
using NomNa.Domain.Entities;

namespace NomNa.Application.Features.Tasks.Commands.CreateTask;

public class CreateTaskCommandHandler : IRequestHandler<CreateTaskCommand, Result<TaskItemDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreateTaskCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<TaskItemDto>> Handle(CreateTaskCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        if (!currentUserId.HasValue)
        {
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");
        }

        var channel = await _context.Channels
            .Where(c => c.Id == request.ChannelId)
            .Select(c => new { c.Id, c.WorkspaceId, c.IsPrivate })
            .FirstOrDefaultAsync(cancellationToken);

        if (channel == null)
        {
            return Error.NotFound("Channel.NotFound", "Channel not found.");
        }

        // Verify workspace membership
        var isWorkspaceMember = await _context.WorkspaceMembers
            .AnyAsync(wm => wm.WorkspaceId == channel.WorkspaceId && wm.UserId == currentUserId.Value, cancellationToken);

        if (!isWorkspaceMember)
        {
            return Error.Forbidden("Workspace.Forbidden", "You are not a member of this workspace.");
        }

        if (channel.IsPrivate)
        {
            var isChannelMember = await _context.ChannelMembers
                .AnyAsync(cm => cm.ChannelId == channel.Id && cm.UserId == currentUserId.Value, cancellationToken);

            if (!isChannelMember)
            {
                return Error.Forbidden("Channel.Forbidden", "You are not a member of this private channel.");
            }
        }

        // If AssigneeId provided, verify assignee belongs to the workspace
        if (request.AssigneeId.HasValue)
        {
            var isAssigneeInWorkspace = await _context.WorkspaceMembers
                .AnyAsync(wm => wm.WorkspaceId == channel.WorkspaceId && wm.UserId == request.AssigneeId.Value, cancellationToken);

            if (!isAssigneeInWorkspace)
            {
                return Error.NotFound("Assignee.NotFound", "Người được giao không thuộc không gian làm việc này.");
            }
        }

        var creator = await _context.Users
            .Where(u => u.Id == currentUserId.Value)
            .Select(u => new TaskMemberSummaryDto(u.Id, u.DisplayName, u.UserName, u.AvatarUrl))
            .FirstOrDefaultAsync(cancellationToken);

        if (creator == null)
        {
            return Error.Unauthorized("User.NotFound", "User account not found.");
        }

        TaskMemberSummaryDto? assignee = null;
        if (request.AssigneeId.HasValue)
        {
            assignee = await _context.Users
                .Where(u => u.Id == request.AssigneeId.Value)
                .Select(u => new TaskMemberSummaryDto(u.Id, u.DisplayName, u.UserName, u.AvatarUrl))
                .FirstOrDefaultAsync(cancellationToken);
        }

        var task = new TaskItem
        {
            WorkspaceId = channel.WorkspaceId,
            ChannelId = channel.Id,
            Title = request.Title.Trim(),
            Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
            AttachmentUrl = string.IsNullOrWhiteSpace(request.AttachmentUrl) ? null : request.AttachmentUrl.Trim(),
            Priority = request.Priority,
            DueDate = request.DueDate,
            CreatedById = currentUserId.Value,
            AssigneeId = request.AssigneeId,
            SourceMessageId = request.SourceMessageId,
            Status = Domain.Enums.TaskItemStatus.Todo
        };

        _context.Tasks.Add(task);
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
            assignee,
            creator
        );

        return dto;
    }
}
