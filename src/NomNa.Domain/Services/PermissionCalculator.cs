using NomNa.Domain.Entities;
using NomNa.Domain.Enums;

namespace NomNa.Domain.Services;

/// <summary>
/// Domain Service thuần túy (Pure Function) tính toán quyền hạn thành viên theo thuật toán phân quyền đa cấp chuẩn Discord.
/// Không có external dependency, độ phức tạp O(N) với N là số lượng role/overwrite, chạy ở mức CPU nanoseconds.
/// </summary>
public static class PermissionCalculator
{
    /// <summary>
    /// Tính toán quyền hạn thực tế của một thành viên trong một Channel cụ thể.
    /// </summary>
    /// <param name="userId">ID người dùng cần kiểm tra.</param>
    /// <param name="serverOwnerId">ID chủ sở hữu Server.</param>
    /// <param name="everyoneRole">Role @everyone mặc định của server.</param>
    /// <param name="memberRoles">Danh sách các Role mà thành viên này được gán (không bắt buộc bao gồm @everyone).</param>
    /// <param name="channelOverwrites">Danh sách các Overwrites được cấu hình trên Channel này.</param>
    /// <returns>Bitmask Permissions cuối cùng sau khi áp dụng toàn bộ hierarchy.</returns>
    public static Permissions CalculateChannelPermissions(
        Guid userId,
        Guid serverOwnerId,
        Role everyoneRole,
        IEnumerable<Role> memberRoles,
        IEnumerable<ChannelPermissionOverwrite> channelOverwrites)
    {
        // -------------------------------------------------------------
        // BƯỚC 1: OWNER BYPASS
        // Chủ server luôn có mọi quyền tối cao, không bao giờ bị ghi đè hay tước quyền.
        // -------------------------------------------------------------
        if (userId == serverOwnerId)
        {
            return Permissions.All;
        }

        // -------------------------------------------------------------
        // BƯỚC 2: BASE PERMISSIONS (Gộp quyền cấp Server)
        // Bắt đầu từ quyền của role @everyone, sau đó OR (|) với toàn bộ role của member.
        // -------------------------------------------------------------
        Permissions permissions = everyoneRole.Permissions;

        var rolesList = memberRoles as IReadOnlyList<Role> ?? memberRoles.ToList();
        foreach (var role in rolesList)
        {
            permissions |= role.Permissions; //|=: or: gộp bit các bit 1, k làm mất bit 1 cũ.
        }

        // -------------------------------------------------------------
        // BƯỚC 3: ADMINISTRATOR BYPASS
        // Nếu user có bất kỳ role nào mang quyền Administrator -> bypass toàn bộ channel overwrites.
        // -------------------------------------------------------------
        if (HasPermission(permissions, Permissions.Administrator))
        {
            return Permissions.All;
        }

        var overwritesList = channelOverwrites as IReadOnlyList<ChannelPermissionOverwrite> ?? channelOverwrites.ToList();

        // -------------------------------------------------------------
        // BƯỚC 4: CHANNEL OVERWRITES CHO @EVERYONE
        // Áp dụng Deny trước (& ~Deny), sau đó Allow (| Allow). (nếu đảm bảo allow & deny = 0 thì thứ tự k quan trọng nhưng cách code này sẽ đảm bảo tính thống nhất hệ thống allow luôn thắng deny)
        // -------------------------------------------------------------
        var everyoneOverwrite = overwritesList.FirstOrDefault(o => 
            o.TargetType == OverwriteType.Role && o.TargetId == everyoneRole.Id);

        if (everyoneOverwrite != null)
        {
            permissions &= ~everyoneOverwrite.Deny;
            permissions |= everyoneOverwrite.Allow;
        }

        // -------------------------------------------------------------
        // BƯỚC 5: CHANNEL OVERWRITES CHO TẤT CẢ ROLES CỦA MEMBER
        // Quy tắc Discord: Gom tất cả Deny của các role lại, gom tất cả Allow lại.
        // Áp dụng Deny trước, Allow sau (Allow thắng Deny giữa các role ngang hàng).
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
        // BƯỚC 6: MEMBER OVERWRITE CỤ THỂ (Ưu tiên cao nhất)
        // Ghi đè chỉ định thẳng cho đích danh cá nhân user tại channel này.
        // -------------------------------------------------------------
        var memberOverwrite = overwritesList.FirstOrDefault(o => 
            o.TargetType == OverwriteType.Member && o.TargetId == userId);

        if (memberOverwrite != null)
        {
            permissions &= ~memberOverwrite.Deny;
            permissions |= memberOverwrite.Allow;
        }

        // -------------------------------------------------------------
        // BƯỚC 7: IMPLICIT VIEW CHANNEL ENFORCEMENT
        // Quy tắc Discord: Nếu không có quyền ViewChannel, thì user không thể 
        // thực hiện bất kỳ hành động nào khác trong channel đó (None).
        // -------------------------------------------------------------
        if (!HasPermission(permissions, Permissions.ViewChannel))
        {
            return Permissions.None;
        }

        return permissions;
    }

    /// <summary>
    /// Tính toán quyền cấp Server (không xét Channel overwrites).
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
    /// Kiểm tra xem một tập quyền có chứa quyền bắt buộc hay không.
    /// </summary>
    public static bool HasPermission(Permissions userPermissions, Permissions requiredPermission)
    {
        return (userPermissions & requiredPermission) == requiredPermission;
    }

    /// <summary>
    /// Kiểm tra xem một tập quyền có chứa bất kỳ quyền nào trong danh sách hay không.
    /// </summary>
    public static bool HasAnyPermission(Permissions userPermissions, Permissions requiredPermissions)
    {
        return (userPermissions & requiredPermissions) != 0;
    }
}


/*
Ý tưởng cơ bản thì sẽ có role trên server, everyone là role mặc định, owener là dựa vào chủ sỡ hữu.
các quyền ở channel có thể override nó có 2 cái allow, deny để dễ hình dung mặc định là 0 hết sẽ là k chọn j.
kiểu ở một permission cụ thể có thể chọn là allow, deny, kế thừa từ cha(k làm j hết).
thuật toán thì ms vào tính permission trên các role của user.
tính thểm các permission trên every override trên channel,
dựng base permission rồi thì sẽ duyệt qua từng role cụ thể để xem allow nhưng thàng nào, deny những thằng nào,
vs lại allow deny giống nhau trên 1 permission nào đó sẽ ưu tiên dùng alow.
*/