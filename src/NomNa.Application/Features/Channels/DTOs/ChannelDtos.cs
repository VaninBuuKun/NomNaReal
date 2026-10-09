using NomNa.Application.Features.Messages.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Channels.DTOs;

public record ChannelDto(
    Guid Id,
    Guid ServerId,
    string? Name,
    ChannelType Type,
    bool IsPrivate,
    DateTime? LastMessageAt = null,
    bool HasUnread = false
);

public record ChannelMemberDto(
    Guid UserId,
    string DisplayName,
    string Username,
    string? AvatarUrl
);

public record AddChannelMemberResultDto(
    Guid ChannelId,
    Guid UserId,
    string DisplayName,
    ChannelDto Channel,
    MessageDto SystemMessage
);

