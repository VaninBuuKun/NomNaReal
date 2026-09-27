using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Domain.Entities;

namespace NomNa.Infrastructure.Persistence;

public class ApplicationDbContext : IdentityDbContext<User, IdentityRole<Guid>, Guid>, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<Workspace> Workspaces => Set<Workspace>();
    public DbSet<WorkspaceMember> WorkspaceMembers => Set<WorkspaceMember>();
    public DbSet<Channel> Channels => Set<Channel>();
    public DbSet<ChannelMember> ChannelMembers => Set<ChannelMember>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<MessageReaction> MessageReactions => Set<MessageReaction>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Identity Tables Mapping
        builder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.Property(e => e.DisplayName).HasMaxLength(100).IsRequired();
            entity.Property(e => e.AvatarUrl).HasMaxLength(500);
            entity.Property(e => e.Bio).HasMaxLength(250);
        });

        builder.Entity<IdentityRole<Guid>>(b => b.ToTable("roles"));
        builder.Entity<IdentityUserRole<Guid>>(b => b.ToTable("user_roles"));
        builder.Entity<IdentityUserClaim<Guid>>(b => b.ToTable("user_claims"));
        builder.Entity<IdentityUserLogin<Guid>>(b => b.ToTable("user_logins"));
        builder.Entity<IdentityUserToken<Guid>>(b => b.ToTable("user_tokens"));
        builder.Entity<IdentityRoleClaim<Guid>>(b => b.ToTable("role_claims"));

        // Workspace Configuration
        builder.Entity<Workspace>(entity =>
        {
            entity.ToTable("workspaces");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.InviteCode).IsUnique();
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.InviteCode).HasMaxLength(16).IsRequired();

            entity.HasOne(e => e.Owner)
                .WithMany()
                .HasForeignKey(e => e.OwnerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // WorkspaceMember Configuration
        builder.Entity<WorkspaceMember>(entity =>
        {
            entity.ToTable("workspace_members");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.WorkspaceId, e.UserId }).IsUnique();

            entity.HasOne(e => e.Workspace)
                .WithMany(w => w.Members)
                .HasForeignKey(e => e.WorkspaceId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany(u => u.WorkspaceMembers)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Channel Configuration
        builder.Entity<Channel>(entity =>
        {
            entity.ToTable("channels");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.WorkspaceId, e.Name }).IsUnique();
            entity.Property(e => e.Name).HasMaxLength(50).IsRequired();

            entity.HasOne(e => e.Workspace)
                .WithMany(w => w.Channels)
                .HasForeignKey(e => e.WorkspaceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ChannelMember Configuration
        builder.Entity<ChannelMember>(entity =>
        {
            entity.ToTable("channel_members");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.ChannelId, e.UserId }).IsUnique();

            entity.HasOne(e => e.Channel)
                .WithMany(c => c.Members)
                .HasForeignKey(e => e.ChannelId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany(u => u.ChannelMembers)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Message Configuration
        builder.Entity<Message>(entity =>
        {
            entity.ToTable("messages");
            entity.HasKey(e => e.Id);
            // Critical index for chat app performance: messages by channel and creation time
            entity.HasIndex(e => new { e.ChannelId, e.CreatedAt });
            entity.HasIndex(e => new { e.ThreadId, e.CreatedAt });
            entity.HasIndex(e => e.SenderId);
            entity.Property(e => e.Content).HasMaxLength(4000).IsRequired();

            entity.HasOne(e => e.Channel)
                .WithMany(c => c.Messages)
                .HasForeignKey(e => e.ChannelId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Sender)
                .WithMany(u => u.Messages)
                .HasForeignKey(e => e.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ParentMessage)
                .WithMany(m => m.Replies)
                .HasForeignKey(e => e.ThreadId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // RefreshToken Configuration
        builder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("refresh_tokens");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.TokenHash);

            entity.HasOne(e => e.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // MessageReaction Configuration
        builder.Entity<MessageReaction>(entity =>
        {
            entity.ToTable("message_reactions");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.MessageId, e.UserId, e.Emoji }).IsUnique();
            entity.Property(e => e.Emoji).HasMaxLength(32).IsRequired();

            entity.HasOne(e => e.Message)
                .WithMany(m => m.Reactions)
                .HasForeignKey(e => e.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
