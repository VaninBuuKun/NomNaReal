using Microsoft.AspNetCore.Identity;
using NomNa.Domain.Enums;

namespace NomNa.Domain.Entities;

public class User : IdentityUser<Guid>
{
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }
    public UserStatus Status { get; set; } = UserStatus.Offline;
    public DateTime? LastSeenAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ICollection<ServerMember> ServerMembers { get; set; } = new List<ServerMember>();
    public ICollection<ChannelMember> ChannelMembers { get; set; } = new List<ChannelMember>();
    public ICollection<Message> Messages { get; set; } = new List<Message>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();

    public User()
    {
        Id = Guid.NewGuid();
    }

    public void UpdateStatus(UserStatus status)
    {
        Status = status;
        UpdatedAt = DateTime.UtcNow;
        if (status == UserStatus.Offline)
        {
            LastSeenAt = DateTime.UtcNow;
        }
    }
}
