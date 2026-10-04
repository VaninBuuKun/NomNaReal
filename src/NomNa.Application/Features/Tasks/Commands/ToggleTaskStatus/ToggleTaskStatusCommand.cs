using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Tasks.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Tasks.Commands.ToggleTaskStatus;

public record ToggleTaskStatusCommand(
    Guid TaskId,
    TaskItemStatus? TargetStatus = null,
    string? CompletionNote = null
) : IRequest<Result<TaskItemDto>>;
