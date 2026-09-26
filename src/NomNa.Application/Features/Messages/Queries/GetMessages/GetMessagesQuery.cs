using MediatR;
using NomNa.Application.Features.Messages.DTOs;

namespace NomNa.Application.Features.Messages.Queries.GetMessages;

public record GetMessagesQuery(
    Guid ChannelId,
    DateTime? Before = null,
    int Limit = 50
) : IRequest<List<MessageDto>>;
