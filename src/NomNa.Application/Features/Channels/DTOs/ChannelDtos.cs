using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Channels.DTOs;

public record ChannelDto(
    Guid Id,
    Guid WorkspaceId,
    string Name,
    string? Topic,
    ChannelType Type,
    bool IsPrivate
);
