using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Tasks.DTOs;

namespace NomNa.Application.Features.Tasks.Queries.GetChannelTasks;

public record GetChannelTasksQuery(Guid ChannelId) : IRequest<Result<List<TaskItemDto>>>;
