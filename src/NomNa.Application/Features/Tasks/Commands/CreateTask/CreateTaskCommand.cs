using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Tasks.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Tasks.Commands.CreateTask;

public record CreateTaskCommand(
    Guid ChannelId,
    string Title,
    string? Note,
    string? AttachmentUrl,
    TaskPriority Priority,
    DateTime? DueDate,
    Guid? AssigneeId,
    Guid? SourceMessageId
) : IRequest<Result<TaskItemDto>>;
