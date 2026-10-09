using MediatR;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Channels.Queries.GetDirectMessages;

public record GetDirectMessagesQuery(Guid ServerId) : IRequest<Result<List<DirectMessageChannelDto>>>;

public record DirectMessageChannelDto(
    Guid Id,
    Guid ServerId,
    Guid TargetUserId,
    string TargetDisplayName,
    string TargetUsername,
    string? TargetAvatarUrl,
    string? TargetEmail,
    string TargetStatus,
    string? LastMessage,
    DateTime? LastMessageAt,
    int UnreadCount
);
