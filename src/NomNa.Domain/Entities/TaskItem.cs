using NomNa.Domain.Common;
using NomNa.Domain.Enums;

namespace NomNa.Domain.Entities;

public class TaskItem : BaseEntity
{
    public Guid WorkspaceId { get; set; }
    public Workspace Workspace { get; set; } = null!;

    public Guid ChannelId { get; set; }
    public Channel Channel { get; set; } = null!;

    public string Title { get; set; } = string.Empty;
    public string? Note { get; set; }
    public string? AttachmentUrl { get; set; }
    public string? CompletionNote { get; set; }

    public TaskItemStatus Status { get; set; } = TaskItemStatus.Todo;
    public TaskPriority Priority { get; set; } = TaskPriority.Normal;

    public DateTime? DueDate { get; set; }
    public DateTime? CompletedAt { get; set; }

    public Guid CreatedById { get; set; }
    public User Creator { get; set; } = null!;

    public Guid? AssigneeId { get; set; }
    public User? Assignee { get; set; }

    public Guid? SourceMessageId { get; set; }
    public Message? SourceMessage { get; set; }
}
