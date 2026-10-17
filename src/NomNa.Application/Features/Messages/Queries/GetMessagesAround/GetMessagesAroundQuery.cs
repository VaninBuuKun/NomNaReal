using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Common.Security;
using NomNa.Application.Features.Messages.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Messages.Queries.GetMessagesAround;

public record GetMessagesAroundQuery(
    Guid ChannelId,
    Guid TargetMessageId,
    int Limit = 30
) : IRequest<Result<MessagesResponseDto>>, IRequireChannelPermission
{
    public Permissions RequiredPermission => Permissions.ViewChannel | Permissions.ReadMessageHistory;
}
