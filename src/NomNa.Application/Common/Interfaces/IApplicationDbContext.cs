using Microsoft.EntityFrameworkCore;
using NomNa.Domain.Entities;

namespace NomNa.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<Server> Servers { get; }
    DbSet<ServerMember> ServerMembers { get; }
    DbSet<Channel> Channels { get; }
    DbSet<ChannelMember> ChannelMembers { get; }
    DbSet<Message> Messages { get; }
    DbSet<MessageReaction> MessageReactions { get; }
    DbSet<ChannelPinnedMessage> ChannelPinnedMessages { get; }
    DbSet<Notification> Notifications { get; }
    DbSet<RefreshToken> RefreshTokens { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
