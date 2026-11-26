using System.Text.Json.Serialization;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Servers.DTOs;

public record ServerBanDto(
    Guid Id,
    Guid ServerId,
    Guid UserId,
    string Username,
    string DisplayName,
    string? AvatarUrl,
    Guid BannedById,
    string BannedByDisplayName,
    string? Reason,
    DateTime CreatedAt);

public record ServerAuditLogDto(
    Guid Id,
    Guid ServerId,
    Guid ActorId,
    string ActorDisplayName,
    string? ActorAvatarUrl,
    [property: JsonConverter(typeof(JsonStringEnumConverter))]
    AuditLogActionType ActionType,
    Guid? TargetId,
    string? TargetName,
    string? Reason,
    string? ChangesJson,
    DateTime CreatedAt);

