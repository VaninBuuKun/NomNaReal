using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;

namespace NomNa.Application.Features.Messages.Queries.GetMessagesAround;

public record GetMessagesAroundQuery(
    Guid ChannelId,
    Guid TargetMessageId,
    int Limit = 30
) : IRequest<Result<MessagesResponseDto>>;
