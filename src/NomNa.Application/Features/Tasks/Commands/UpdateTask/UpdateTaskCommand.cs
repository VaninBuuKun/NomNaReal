using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Tasks.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Tasks.Commands.UpdateTask;

public record UpdateTaskCommand(
    Guid TaskId,
    string Title,
    string? Note,
    string? AttachmentUrl,
    TaskPriority Priority,
    DateTime? DueDate,
    Guid? AssigneeId,
    string? CompletionNote
) : IRequest<Result<TaskItemDto>>;
