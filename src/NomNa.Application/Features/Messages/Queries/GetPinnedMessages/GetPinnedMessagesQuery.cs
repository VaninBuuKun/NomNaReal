using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Common.Security;
using NomNa.Application.Features.Messages.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Messages.Queries.GetPinnedMessages;

public record GetPinnedMessagesQuery(Guid ChannelId) : IRequest<Result<List<PinnedMessageDto>>>, IRequireChannelPermission
{
    public Permissions RequiredPermission => Permissions.ViewChannel;
}
