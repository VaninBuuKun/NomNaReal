namespace NomNa.Domain.Enums;

/// <summary>
/// User status display preference following the Discord specification.
/// Physical network connectivity (Online/Offline) is tracked independently via Redis leases.
/// </summary>
public enum UserStatusPreference
{
    /// <summary>
    /// Normal mode: Displays as Online (green dot) when active Redis lease exists.
    /// </summary>
    Online = 0,

    /// <summary>
    /// Away / Idle mode: Displays as Idle (amber dot) when active Redis lease exists.
    /// </summary>
    Idle = 1,

    /// <summary>
    /// Do Not Disturb mode: Displays as Busy (red dot, suppressed notifications) when active Redis lease exists.
    /// </summary>
    DoNotDisturb = 2,

    /// <summary>
    /// Invisible mode: Connected normally but intentionally appears Offline (grey dot) to others.
    /// </summary>
    Invisible = 3
}
