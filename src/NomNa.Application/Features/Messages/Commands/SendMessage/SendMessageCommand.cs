using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;

using NomNa.Application.Common.Security;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Messages.Commands.SendMessage;

public record SendMessageCommand(
    Guid ChannelId,
    string? Content,
    Guid? ReplyToMessageId = null,
    List<AttachmentInputDto>? Attachments = null
) : IRequest<Result<MessageDto>>, IRequireChannelPermission
{
    public Permissions RequiredPermission => Permissions.SendMessages;
}
