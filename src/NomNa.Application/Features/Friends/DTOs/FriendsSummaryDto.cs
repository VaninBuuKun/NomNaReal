namespace NomNa.Application.Features.Friends.DTOs;

public record FriendsSummaryDto(
    List<FriendDto> Friends,
    List<FriendDto> PendingIncoming,
    List<FriendDto> PendingOutgoing,
    List<FriendDto> Blocked
);
