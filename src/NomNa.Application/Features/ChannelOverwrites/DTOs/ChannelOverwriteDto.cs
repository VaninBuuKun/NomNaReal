using NomNa.Domain.Enums;

namespace NomNa.Application.Features.ChannelOverwrites.DTOs;

public record ChannelOverwriteDto(
    Guid Id,
    Guid ChannelId,
    Guid TargetId,
    OverwriteType TargetType,
    string TargetName,
    string? TargetColorHex,
    long Allow,
    long Deny
);
