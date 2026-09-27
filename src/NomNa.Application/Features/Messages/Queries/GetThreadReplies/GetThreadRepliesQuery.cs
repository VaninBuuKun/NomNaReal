using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;

namespace NomNa.Application.Features.Messages.Queries.GetThreadReplies;

public record GetThreadRepliesQuery(Guid ParentMessageId) : IRequest<Result<ThreadDetailsDto>>;
