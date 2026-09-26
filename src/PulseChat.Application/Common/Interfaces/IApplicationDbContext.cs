using Microsoft.EntityFrameworkCore;
using PulseChat.Domain.Entities;

namespace PulseChat.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<Workspace> Workspaces { get; }
    DbSet<WorkspaceMember> WorkspaceMembers { get; }
    DbSet<Channel> Channels { get; }
    DbSet<ChannelMember> ChannelMembers { get; }
    DbSet<Message> Messages { get; }
    DbSet<RefreshToken> RefreshTokens { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
