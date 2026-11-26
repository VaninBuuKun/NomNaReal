using MediatR;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Messages.Commands.MarkChannelAsRead;

public record MarkChannelAsReadDto(
    Guid ChannelId,
    Guid UserId,
    Guid LastReadMessageId,
    DateTime LastReadAt);

public record MarkChannelAsReadCommand(
    Guid ChannelId,
    Guid MessageId) : IRequest<Result<MarkChannelAsReadDto?>>;
