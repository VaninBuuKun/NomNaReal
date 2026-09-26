using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;

namespace NomNa.Application.Features.Messages.Commands.SendMessage;

public record SendMessageCommand(
    Guid ChannelId,
    string Content,
    Guid? ThreadId = null
) : IRequest<Result<MessageDto>>;
