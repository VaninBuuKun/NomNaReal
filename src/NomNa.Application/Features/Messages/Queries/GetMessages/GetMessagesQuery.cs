using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Common.Security;
using NomNa.Application.Features.Messages.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Messages.Queries.GetMessages;

public record GetMessagesQuery(
    Guid ChannelId,
    DateTime? Before = null,
    DateTime? After = null,
    int Limit = 25
) : IRequest<Result<MessagesResponseDto>>, IRequireChannelPermission
{
    public Permissions RequiredPermission => Permissions.ViewChannel | Permissions.ReadMessageHistory;
}

