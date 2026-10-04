using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Tasks.DTOs;

namespace NomNa.Application.Features.Tasks.Queries.GetChannelTasks;

public class GetChannelTasksQueryHandler : IRequestHandler<GetChannelTasksQuery, Result<List<TaskItemDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetChannelTasksQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<List<TaskItemDto>>> Handle(GetChannelTasksQuery request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        if (!currentUserId.HasValue)
        {
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");
        }

        var channel = await _context.Channels
            .AsNoTracking()
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

        // If private channel, check channel membership
        if (channel.IsPrivate)
        {
            var isChannelMember = await _context.ChannelMembers
                .AnyAsync(cm => cm.ChannelId == channel.Id && cm.UserId == currentUserId.Value, cancellationToken);

            if (!isChannelMember)
            {
                return Error.Forbidden("Channel.Forbidden", "You are not a member of this private channel.");
            }
        }

        var tasks = await _context.Tasks
            .AsNoTracking()
            .Where(t => t.ChannelId == request.ChannelId)
            .Include(t => t.Creator)
            .Include(t => t.Assignee)
            .OrderBy(t => t.Status == Domain.Enums.TaskItemStatus.Done ? 1 : 0)
            .ThenByDescending(t => t.Priority)
            .ThenBy(t => t.DueDate)
            .ThenByDescending(t => t.CreatedAt)
            .Select(t => new TaskItemDto(
                t.Id,
                t.WorkspaceId,
                t.ChannelId,
                t.Title,
                t.Note,
                t.AttachmentUrl,
                t.CompletionNote,
                t.Status,
                t.Priority,
                t.DueDate,
                t.CompletedAt,
                t.CreatedById,
                t.AssigneeId,
                t.SourceMessageId,
                t.CreatedAt,
                t.UpdatedAt,
                t.Assignee != null
                    ? new TaskMemberSummaryDto(
                        t.Assignee.Id,
                        t.Assignee.DisplayName,
                        t.Assignee.UserName,
                        t.Assignee.AvatarUrl)
                    : null,
                new TaskMemberSummaryDto(
                    t.Creator.Id,
                    t.Creator.DisplayName,
                    t.Creator.UserName,
                    t.Creator.AvatarUrl)
            ))
            .ToListAsync(cancellationToken);

        return tasks;
    }
}
