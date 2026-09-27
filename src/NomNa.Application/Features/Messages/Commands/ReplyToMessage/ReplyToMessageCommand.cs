using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;

namespace NomNa.Application.Features.Messages.Commands.ReplyToMessage;

public record ReplyToMessageCommand(
    Guid ParentMessageId,
    string Content
) : IRequest<Result<MessageDto>>;
