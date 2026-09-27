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

public enum WorkspaceRole
{
    Member = 0,
    Admin = 1,
    Owner = 2
}
