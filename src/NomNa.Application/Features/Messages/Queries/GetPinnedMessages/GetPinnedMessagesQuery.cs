using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;

namespace NomNa.Application.Features.Messages.Queries.GetPinnedMessages;

public record GetPinnedMessagesQuery(Guid ChannelId) : IRequest<Result<List<PinnedMessageDto>>>;
