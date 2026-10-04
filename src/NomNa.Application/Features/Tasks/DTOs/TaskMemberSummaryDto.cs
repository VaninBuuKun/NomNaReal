namespace NomNa.Application.Features.Tasks.DTOs;

public record TaskMemberSummaryDto(
    Guid Id,
    string DisplayName,
    string? Username,
    string? AvatarUrl
);
