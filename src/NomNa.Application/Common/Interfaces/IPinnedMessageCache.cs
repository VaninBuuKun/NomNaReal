using NomNa.Application.Features.Messages.DTOs;

namespace NomNa.Application.Common.Interfaces;

public interface IPinnedMessageCache
{
    List<PinnedMessageDto>? Get(Guid channelId);
    void Set(Guid channelId, List<PinnedMessageDto> pinnedMessages);
    void Invalidate(Guid channelId);
}
