namespace NomNa.Domain.Enums;

public enum UserStatus
{
    Online = 0,
    Away = 1,
    DoNotDisturb = 2,
    Offline = 3
}

public enum ChannelType
{
    Text = 0,
    Voice = 1,
    DirectMessage = 2
}

public enum ServerRole
{
    Member = 0,
    Admin = 1,
    Owner = 2
}

public enum NotificationType
{
    Mention = 1,
    ThreadReply = 2,
    ChannelInvite = 3,
    ServerInvite = 4,
    FriendRequest = 5,
    FriendAccepted = 6
}

public enum FriendshipStatus
{
    Pending = 0,
    Accepted = 1,
    Blocked = 2
}
