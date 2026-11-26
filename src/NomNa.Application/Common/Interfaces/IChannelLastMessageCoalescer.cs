namespace NomNa.Application.Common.Interfaces;

/// <summary>
/// Buffers channel last-message metadata updates in memory and flushes them in batches
/// to eliminate row-level lock contention on hot channels in PostgreSQL.
/// </summary>
public interface IChannelLastMessageCoalescer
{
    /// <summary>
    /// Enqueues or overwrites the latest message metadata for a channel.
    /// </summary>
    void Enqueue(Guid channelId, DateTime lastMessageAt, string? lastMessageContent, Guid lastMessageSenderId);
}
