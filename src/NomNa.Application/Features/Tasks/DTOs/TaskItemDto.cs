using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Tasks.DTOs;

public record TaskItemDto(
    Guid Id,
    Guid WorkspaceId,
    Guid ChannelId,
    string Title,
    string? Note,
    string? AttachmentUrl,
    string? CompletionNote,
    TaskItemStatus Status,
    TaskPriority Priority,
    DateTime? DueDate,
    DateTime? CompletedAt,
    Guid CreatedById,
    Guid? AssigneeId,
    Guid? SourceMessageId,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    TaskMemberSummaryDto? Assignee,
    TaskMemberSummaryDto Creator
);
