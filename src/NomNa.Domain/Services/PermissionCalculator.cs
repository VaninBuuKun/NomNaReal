using NomNa.Domain.Entities;
using NomNa.Domain.Enums;

namespace NomNa.Domain.Services;

/// <summary>
/// Pure Domain Service evaluating member permissions following the Discord-grade hierarchical algorithm.
/// Zero external dependencies, O(N) complexity where N is the number of roles/overwrites, executing in nanoseconds.
/// </summary>
public static class PermissionCalculator
{
    /// <summary>
    /// Computes the effective permissions of a user in a specific channel.
    /// </summary>
    /// <param name="userId">Target user identifier.</param>
    /// <param name="serverOwnerId">Server owner identifier.</param>
    /// <param name="everyoneRole">Default @everyone role of the server.</param>
    /// <param name="memberRoles">Assigned roles for the member.</param>
    /// <param name="channelOverwrites">Configured overwrites on this channel.</param>
    /// <returns>Final effective Permissions bitmask after resolving the entire hierarchy.</returns>
    public static Permissions CalculateChannelPermissions(
        Guid userId,
        Guid serverOwnerId,
        Role everyoneRole,
        IEnumerable<Role> memberRoles,
        IEnumerable<ChannelPermissionOverwrite> channelOverwrites)
    {
        // -------------------------------------------------------------
        // STEP 1: OWNER BYPASS
        // Server owner always has all permissions, immune to denies or overrides.
        // -------------------------------------------------------------
        if (userId == serverOwnerId)
        {
            return Permissions.All;
        }

        // -------------------------------------------------------------
        // STEP 2: BASE PERMISSIONS (Server-level union)
        // Starts with @everyone permissions, then unions (|) all member roles.
        // -------------------------------------------------------------
        Permissions permissions = everyoneRole.Permissions;

        var rolesList = memberRoles as IReadOnlyList<Role> ?? memberRoles.ToList();
        foreach (var role in rolesList)
        {
            permissions |= role.Permissions;
        }

        // -------------------------------------------------------------
        // STEP 3: ADMINISTRATOR BYPASS
        // If member possesses Administrator in any server role -> bypass all channel overwrites.
        // -------------------------------------------------------------
        if (HasPermission(permissions, Permissions.Administrator))
        {
            return Permissions.All;
        }

        var overwritesList = channelOverwrites as IReadOnlyList<ChannelPermissionOverwrite> ?? channelOverwrites.ToList();

        // -------------------------------------------------------------
        // STEP 4: CHANNEL OVERWRITES FOR @EVERYONE
        // Apply Deny first (& ~Deny), then Apply Allow (| Allow).
        // -------------------------------------------------------------
        var everyoneOverwrite = overwritesList.FirstOrDefault(o => 
            o.TargetType == OverwriteType.Role && o.TargetId == everyoneRole.Id);

        if (everyoneOverwrite != null)
        {
            permissions &= ~everyoneOverwrite.Deny;
            permissions |= everyoneOverwrite.Allow;
        }

        // -------------------------------------------------------------
        // STEP 5: CHANNEL OVERWRITES FOR ALL MEMBER ROLES
        // Discord rule: Aggregate all Deny bits and Allow bits across member roles.
        // Apply Deny first, then Allow (Allow wins conflicts among peer roles).
        // -------------------------------------------------------------
        var roleIds = new HashSet<Guid>(rolesList.Select(r => r.Id));
        Permissions rolesDeny = Permissions.None;
        Permissions rolesAllow = Permissions.None;

        foreach (var overwrite in overwritesList)
        {
            if (overwrite.TargetType == OverwriteType.Role && roleIds.Contains(overwrite.TargetId))
            {
                rolesDeny |= overwrite.Deny;
                rolesAllow |= overwrite.Allow;
            }
        }

        permissions &= ~rolesDeny;
        permissions |= rolesAllow;

        // -------------------------------------------------------------
        // STEP 6: MEMBER-SPECIFIC OVERWRITE (Highest priority overwrite)
        // Direct override tailored specifically for this individual user in the channel.
        // -------------------------------------------------------------
        var memberOverwrite = overwritesList.FirstOrDefault(o => 
            o.TargetType == OverwriteType.Member && o.TargetId == userId);

        if (memberOverwrite != null)
        {
            permissions &= ~memberOverwrite.Deny;
            permissions |= memberOverwrite.Allow;
        }

        // -------------------------------------------------------------
        // STEP 7: IMPLICIT VIEW CHANNEL ENFORCEMENT
        // Discord rule: Without ViewChannel permission, the member cannot perform any action (None).
        // -------------------------------------------------------------
        if (!HasPermission(permissions, Permissions.ViewChannel))
        {
            return Permissions.None;
        }

        return permissions;
    }

    /// <summary>
    /// Computes server-level permissions without channel overwrites.
    /// </summary>
    public static Permissions CalculateServerPermissions(
        Guid userId,
        Guid serverOwnerId,
        Role everyoneRole,
        IEnumerable<Role> memberRoles)
    {
        if (userId == serverOwnerId)
        {
            return Permissions.All;
        }

        Permissions permissions = everyoneRole.Permissions;
        foreach (var role in memberRoles)
        {
            permissions |= role.Permissions;
        }

        if (HasPermission(permissions, Permissions.Administrator))
        {
            return Permissions.All;
        }

        return permissions;
    }

    /// <summary>
    /// Determines whether the permissions set includes the required permission.
    /// </summary>
    public static bool HasPermission(Permissions userPermissions, Permissions requiredPermission)
    {
        return (userPermissions & requiredPermission) == requiredPermission;
    }

    /// <summary>
    /// Determines whether the permissions set includes any of the specified permissions.
    /// </summary>
    public static bool HasAnyPermission(Permissions userPermissions, Permissions requiredPermissions)
    {
        return (userPermissions & requiredPermissions) != 0;
    }
}