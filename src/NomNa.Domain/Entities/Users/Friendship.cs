using NomNa.Domain.Common;
using NomNa.Domain.Enums;

namespace NomNa.Domain.Entities;

public class Friendship : BaseEntity
{
    public Guid RequesterId { get; set; }
    public User Requester { get; set; } = null!;

    public Guid AddresseeId { get; set; }
    public User Addressee { get; set; } = null!;

    public FriendshipStatus Status { get; set; } = FriendshipStatus.Pending;
}
