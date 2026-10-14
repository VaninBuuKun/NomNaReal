using FluentAssertions;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;
using NomNa.Domain.Services;
using Xunit;

namespace NomNa.Domain.UnitTests;

public class PermissionCalculatorTests
{
    private readonly Guid _ownerId = Guid.NewGuid();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _otherUserId = Guid.NewGuid();
    private readonly Role _everyoneRole;

    public PermissionCalculatorTests()
    {
        _everyoneRole = new Role
        {
            Id = Guid.NewGuid(),
            Name = "@everyone",
            IsDefault = true,
            Permissions = Permissions.Default // ViewChannel, SendMessages, ReadMessageHistory, etc.
        };
    }

    #region 1. Server Owner Hierarchy Tests

    [Fact]
    public void CalculateServerPermissions_WhenUserIsOwner_ShouldReturnAllPermissions()
    {
        // Act
        var permissions = PermissionCalculator.CalculateServerPermissions(
            _ownerId, _ownerId, _everyoneRole, Enumerable.Empty<Role>());

        // Assert
        permissions.Should().Be(Permissions.All);
    }

    [Fact]
    public void CalculateChannelPermissions_WhenUserIsOwner_ShouldReturnAllPermissions()
    {
        // Arrange: Kênh có overwrite cấm tiệt @everyone
        var overwrites = new List<ChannelPermissionOverwrite>
        {
            new()
            {
                TargetId = _everyoneRole.Id,
                TargetType = OverwriteType.Role,
                Deny = Permissions.All
            }
        };

        // Act
        var permissions = PermissionCalculator.CalculateChannelPermissions(
            _ownerId, _ownerId, _everyoneRole, Enumerable.Empty<Role>(), overwrites);

        // Assert
        permissions.Should().Be(Permissions.All);
    }

    [Fact]
    public void CalculateChannelPermissions_WhenUserIsOwner_EvenWithExplicitMemberDeny_ShouldBypassAndReturnAll()
    {
        // Arrange: Overwrite chỉ đích danh Owner để cấm SendMessages
        var overwrites = new List<ChannelPermissionOverwrite>
        {
            new()
            {
                TargetId = _ownerId,
                TargetType = OverwriteType.Member,
                Deny = Permissions.SendMessages | Permissions.ViewChannel
            }
        };

        // Act
        var permissions = PermissionCalculator.CalculateChannelPermissions(
            _ownerId, _ownerId, _everyoneRole, Enumerable.Empty<Role>(), overwrites);

        // Assert: Chủ server là bất khả xâm phạm
        permissions.Should().Be(Permissions.All);
    }

    #endregion

    #region 2. Administrator Role Bypass Tests

    [Fact]
    public void CalculateServerPermissions_WhenMemberHasAdministratorRole_ShouldReturnAllPermissions()
    {
        // Arrange
        var adminRole = new Role
        {
            Id = Guid.NewGuid(),
            Name = "Admin",
            Permissions = Permissions.Administrator
        };

        // Act
        var permissions = PermissionCalculator.CalculateServerPermissions(
            _userId, _ownerId, _everyoneRole, new[] { adminRole });

        // Assert
        permissions.Should().Be(Permissions.All);
    }

    [Fact]
    public void CalculateChannelPermissions_WhenMemberHasAdministratorRole_ShouldBypassChannelOverwrites()
    {
        // Arrange: Kênh cấm hoàn toàn ViewChannel và SendMessages
        var adminRole = new Role
        {
            Id = Guid.NewGuid(),
            Name = "Admin",
            Permissions = Permissions.Administrator
        };

        var overwrites = new List<ChannelPermissionOverwrite>
        {
            new()
            {
                TargetId = _everyoneRole.Id,
                TargetType = OverwriteType.Role,
                Deny = Permissions.ViewChannel | Permissions.SendMessages
            },
            new()
            {
                TargetId = adminRole.Id,
                TargetType = OverwriteType.Role,
                Deny = Permissions.SendMessages
            },
            new()
            {
                TargetId = _userId,
                TargetType = OverwriteType.Member,
                Deny = Permissions.All
            }
        };

        // Act
        var permissions = PermissionCalculator.CalculateChannelPermissions(
            _userId, _ownerId, _everyoneRole, new[] { adminRole }, overwrites);

        // Assert: Có Administrator role thì bypass mọi overwrites
        permissions.Should().Be(Permissions.All);
    }

    [Fact]
    public void CalculateChannelPermissions_WhenMemberLacksAdministratorRole_ShouldNotBypass()
    {
        // Arrange
        var modRole = new Role
        {
            Id = Guid.NewGuid(),
            Name = "Moderator",
            Permissions = Permissions.KickMembers | Permissions.ManageMessages
        };

        // Act
        var permissions = PermissionCalculator.CalculateChannelPermissions(
            _userId, _ownerId, _everyoneRole, new[] { modRole }, Enumerable.Empty<ChannelPermissionOverwrite>());

        // Assert
        permissions.Should().NotBe(Permissions.All);
        PermissionCalculator.HasPermission(permissions, Permissions.Administrator).Should().BeFalse();
        PermissionCalculator.HasPermission(permissions, Permissions.KickMembers).Should().BeTrue();
    }

    #endregion

    #region 3. Base Permissions (@everyone & Multiple Roles)

    [Fact]
    public void CalculateServerPermissions_WithOnlyEveryoneRole_ShouldMatchEveryonePermissions()
    {
        // Act
        var permissions = PermissionCalculator.CalculateServerPermissions(
            _userId, _ownerId, _everyoneRole, Enumerable.Empty<Role>());

        // Assert
        permissions.Should().Be(_everyoneRole.Permissions);
    }

    [Fact]
    public void CalculateServerPermissions_WithAdditionalRole_ShouldUnionPermissions()
    {
        // Arrange
        var djRole = new Role
        {
            Id = Guid.NewGuid(),
            Name = "DJ",
            Permissions = Permissions.MuteMembers | Permissions.MoveMembers
        };

        // Act
        var permissions = PermissionCalculator.CalculateServerPermissions(
            _userId, _ownerId, _everyoneRole, new[] { djRole });

        // Assert: @everyone Default + MuteMembers + MoveMembers
        var expected = _everyoneRole.Permissions | Permissions.MuteMembers | Permissions.MoveMembers;
        permissions.Should().Be(expected);
        PermissionCalculator.HasPermission(permissions, Permissions.MuteMembers).Should().BeTrue();
        PermissionCalculator.HasPermission(permissions, Permissions.MoveMembers).Should().BeTrue();
        PermissionCalculator.HasPermission(permissions, Permissions.SendMessages).Should().BeTrue();
    }

    [Fact]
    public void CalculateServerPermissions_WithMultipleAdditionalRoles_ShouldUnionAll()
    {
        // Arrange
        var roleA = new Role { Id = Guid.NewGuid(), Permissions = Permissions.KickMembers };
        var roleB = new Role { Id = Guid.NewGuid(), Permissions = Permissions.BanMembers };
        var roleC = new Role { Id = Guid.NewGuid(), Permissions = Permissions.ManageChannels };

        // Act
        var permissions = PermissionCalculator.CalculateServerPermissions(
            _userId, _ownerId, _everyoneRole, new[] { roleA, roleB, roleC });

        // Assert
        PermissionCalculator.HasPermission(permissions, Permissions.KickMembers).Should().BeTrue();
        PermissionCalculator.HasPermission(permissions, Permissions.BanMembers).Should().BeTrue();
        PermissionCalculator.HasPermission(permissions, Permissions.ManageChannels).Should().BeTrue();
    }

    [Fact]
    public void CalculateServerPermissions_WithZeroPermissionsRole_ShouldNotDiminishEveryonePermissions()
    {
        // Arrange: Role không có quyền gì (None)
        var mutedRole = new Role { Id = Guid.NewGuid(), Permissions = Permissions.None };

        // Act
        var permissions = PermissionCalculator.CalculateServerPermissions(
            _userId, _ownerId, _everyoneRole, new[] { mutedRole });

        // Assert: Vẫn giữ nguyên quyền của @everyone (vì server base permissions là phép OR)
        permissions.Should().Be(_everyoneRole.Permissions);
    }

    #endregion

    #region 4. @everyone Channel Overwrites

    [Fact]
    public void CalculateChannelPermissions_WhenEveryoneDeniesSendMessages_ShouldRemoveSendMessages()
    {
        // Arrange: Kênh thông báo (Read-only) cấm @everyone chat
        var overwrites = new List<ChannelPermissionOverwrite>
        {
            new()
            {
                TargetId = _everyoneRole.Id,
                TargetType = OverwriteType.Role,
                Deny = Permissions.SendMessages
            }
        };

        // Act
        var permissions = PermissionCalculator.CalculateChannelPermissions(
            _userId, _ownerId, _everyoneRole, Enumerable.Empty<Role>(), overwrites);

        // Assert
        PermissionCalculator.HasPermission(permissions, Permissions.SendMessages).Should().BeFalse();
        PermissionCalculator.HasPermission(permissions, Permissions.ViewChannel).Should().BeTrue();
        PermissionCalculator.HasPermission(permissions, Permissions.ReadMessageHistory).Should().BeTrue();
    }

    [Fact]
    public void CalculateChannelPermissions_WhenEveryoneAllowsExtraPermission_ShouldIncludePermission()
    {
        // Arrange: Kênh cho phép @everyone mention
        var overwrites = new List<ChannelPermissionOverwrite>
        {
            new()
            {
                TargetId = _everyoneRole.Id,
                TargetType = OverwriteType.Role,
                Allow = Permissions.MentionEveryone
            }
        };

        // Act
        var permissions = PermissionCalculator.CalculateChannelPermissions(
            _userId, _ownerId, _everyoneRole, Enumerable.Empty<Role>(), overwrites);

        // Assert
        PermissionCalculator.HasPermission(permissions, Permissions.MentionEveryone).Should().BeTrue();
    }

    [Fact]
    public void CalculateChannelPermissions_WhenEveryoneHasBothAllowAndDeny_ShouldApplyBothCorrectly()
    {
        // Arrange
        var overwrites = new List<ChannelPermissionOverwrite>
        {
            new()
            {
                TargetId = _everyoneRole.Id,
                TargetType = OverwriteType.Role,
                Deny = Permissions.SendMessages | Permissions.AttachFiles,
                Allow = Permissions.MentionEveryone
            }
        };

        // Act
        var permissions = PermissionCalculator.CalculateChannelPermissions(
            _userId, _ownerId, _everyoneRole, Enumerable.Empty<Role>(), overwrites);

        // Assert
        PermissionCalculator.HasPermission(permissions, Permissions.SendMessages).Should().BeFalse();
        PermissionCalculator.HasPermission(permissions, Permissions.AttachFiles).Should().BeFalse();
        PermissionCalculator.HasPermission(permissions, Permissions.MentionEveryone).Should().BeTrue();
    }

    [Fact]
    public void CalculateChannelPermissions_WhenEveryoneDeniesViewChannel_ShouldReturnNone()
    {
        // Arrange: Kênh private cấm @everyone xem
        var overwrites = new List<ChannelPermissionOverwrite>
        {
            new()
            {
                TargetId = _everyoneRole.Id,
                TargetType = OverwriteType.Role,
                Deny = Permissions.ViewChannel
            }
        };

        // Act
        var permissions = PermissionCalculator.CalculateChannelPermissions(
            _userId, _ownerId, _everyoneRole, Enumerable.Empty<Role>(), overwrites);

        // Assert: Mất ViewChannel thì kết quả là None
        permissions.Should().Be(Permissions.None);
    }

    #endregion

    #region 5. Role Channel Overwrites & Collision Resolution

    [Fact]
    public void CalculateChannelPermissions_WhenChannelAllowsRoleToView_PrivateChannelBecomesVisible()
    {
        // Arrange: Kênh cấm @everyone xem, nhưng cấp phép cho Role "VIP"
        var vipRole = new Role { Id = Guid.NewGuid(), Name = "VIP" };
        var overwrites = new List<ChannelPermissionOverwrite>
        {
            new()
            {
                TargetId = _everyoneRole.Id,
                TargetType = OverwriteType.Role,
                Deny = Permissions.ViewChannel
            },
            new()
            {
                TargetId = vipRole.Id,
                TargetType = OverwriteType.Role,
                Allow = Permissions.ViewChannel | Permissions.SendMessages
            }
        };

        // Act: User có role VIP
        var permissions = PermissionCalculator.CalculateChannelPermissions(
            _userId, _ownerId, _everyoneRole, new[] { vipRole }, overwrites);

        // Assert: Thấy kênh và gửi được tin
        PermissionCalculator.HasPermission(permissions, Permissions.ViewChannel).Should().BeTrue();
        PermissionCalculator.HasPermission(permissions, Permissions.SendMessages).Should().BeTrue();
    }

    [Fact]
    public void CalculateChannelPermissions_WhenChannelDeniesRole_ShouldRevokePermission()
    {
        // Arrange: Role "Muted" bị Deny SendMessages
        var mutedRole = new Role { Id = Guid.NewGuid(), Name = "Muted" };
        var overwrites = new List<ChannelPermissionOverwrite>
        {
            new()
            {
                TargetId = mutedRole.Id,
                TargetType = OverwriteType.Role,
                Deny = Permissions.SendMessages
            }
        };

        // Act
        var permissions = PermissionCalculator.CalculateChannelPermissions(
            _userId, _ownerId, _everyoneRole, new[] { mutedRole }, overwrites);

        // Assert
        PermissionCalculator.HasPermission(permissions, Permissions.SendMessages).Should().BeFalse();
        PermissionCalculator.HasPermission(permissions, Permissions.ViewChannel).Should().BeTrue();
    }

    [Fact]
    public void CalculateChannelPermissions_WhenMultipleRolesCollide_AllowMustWinOverDeny()
    {
        // ⭐ QUY TẮC CỐT LÕI CỦA DISCORD:
        // User có Role A (bị Deny AttachFiles) và Role B (được Allow AttachFiles)
        // -> Kết quả tại channel: Allow thắng Deny!
        var roleA = new Role { Id = Guid.NewGuid(), Name = "RoleA" };
        var roleB = new Role { Id = Guid.NewGuid(), Name = "RoleB" };

        var overwrites = new List<ChannelPermissionOverwrite>
        {
            new()
            {
                TargetId = roleA.Id,
                TargetType = OverwriteType.Role,
                Deny = Permissions.AttachFiles
            },
            new()
            {
                TargetId = roleB.Id,
                TargetType = OverwriteType.Role,
                Allow = Permissions.AttachFiles
            }
        };

        // Act
        var permissions = PermissionCalculator.CalculateChannelPermissions(
            _userId, _ownerId, _everyoneRole, new[] { roleA, roleB }, overwrites);

        // Assert: Allow thắng Deny
        PermissionCalculator.HasPermission(permissions, Permissions.AttachFiles).Should().BeTrue();
    }

    [Fact]
    public void CalculateChannelPermissions_RoleOverwriteShouldNotAffectUsersWithoutThatRole()
    {
        // Arrange: Overwrite cho role Mod, nhưng user không có role Mod
        var modRole = new Role { Id = Guid.NewGuid(), Name = "Mod" };
        var overwrites = new List<ChannelPermissionOverwrite>
        {
            new()
            {
                TargetId = modRole.Id,
                TargetType = OverwriteType.Role,
                Allow = Permissions.ManageMessages
            }
        };

        // Act: User thường (không có role)
        var permissions = PermissionCalculator.CalculateChannelPermissions(
            _userId, _ownerId, _everyoneRole, Enumerable.Empty<Role>(), overwrites);

        // Assert: Không nhận được ManageMessages
        PermissionCalculator.HasPermission(permissions, Permissions.ManageMessages).Should().BeFalse();
    }

    #endregion

    #region 6. Member-Specific Overwrites (Highest Precedence)

    [Fact]
    public void CalculateChannelPermissions_MemberDeny_OverridesRoleAllow()
    {
        // Arrange: Role VIP được phép SendMessages, nhưng cá nhân User bị đích thân Admin Deny SendMessages
        var vipRole = new Role { Id = Guid.NewGuid(), Name = "VIP" };
        var overwrites = new List<ChannelPermissionOverwrite>
        {
            new()
            {
                TargetId = vipRole.Id,
                TargetType = OverwriteType.Role,
                Allow = Permissions.SendMessages
            },
            new()
            {
                TargetId = _userId,
                TargetType = OverwriteType.Member,
                Deny = Permissions.SendMessages
            }
        };

        // Act
        var permissions = PermissionCalculator.CalculateChannelPermissions(
            _userId, _ownerId, _everyoneRole, new[] { vipRole }, overwrites);

        // Assert: Member Overwrite có độ ưu tiên cao nhất -> Bị Deny
        PermissionCalculator.HasPermission(permissions, Permissions.SendMessages).Should().BeFalse();
    }

    [Fact]
    public void CalculateChannelPermissions_MemberAllow_OverridesRoleDeny()
    {
        // Arrange: Role Muted bị Deny SendMessages, nhưng cá nhân User được Member Overwrite Allow
        var mutedRole = new Role { Id = Guid.NewGuid(), Name = "Muted" };
        var overwrites = new List<ChannelPermissionOverwrite>
        {
            new()
            {
                TargetId = mutedRole.Id,
                TargetType = OverwriteType.Role,
                Deny = Permissions.SendMessages
            },
            new()
            {
                TargetId = _userId,
                TargetType = OverwriteType.Member,
                Allow = Permissions.SendMessages
            }
        };

        // Act
        var permissions = PermissionCalculator.CalculateChannelPermissions(
            _userId, _ownerId, _everyoneRole, new[] { mutedRole }, overwrites);

        // Assert: Được phép gửi tin
        PermissionCalculator.HasPermission(permissions, Permissions.SendMessages).Should().BeTrue();
    }

    [Fact]
    public void CalculateChannelPermissions_MemberAllow_OverridesEveryoneDeny()
    {
        // Arrange: Kênh private cấm @everyone xem, nhưng thêm riêng cá nhân User này vào kênh
        var overwrites = new List<ChannelPermissionOverwrite>
        {
            new()
            {
                TargetId = _everyoneRole.Id,
                TargetType = OverwriteType.Role,
                Deny = Permissions.ViewChannel
            },
            new()
            {
                TargetId = _userId,
                TargetType = OverwriteType.Member,
                Allow = Permissions.ViewChannel | Permissions.SendMessages
            }
        };

        // Act
        var permissions = PermissionCalculator.CalculateChannelPermissions(
            _userId, _ownerId, _everyoneRole, Enumerable.Empty<Role>(), overwrites);

        // Assert
        PermissionCalculator.HasPermission(permissions, Permissions.ViewChannel).Should().BeTrue();
        PermissionCalculator.HasPermission(permissions, Permissions.SendMessages).Should().BeTrue();
    }

    [Fact]
    public void CalculateChannelPermissions_MemberOverwrite_DoesNotAffectOtherMembers()
    {
        // Arrange: Gán Member Overwrite cho _userId
        var overwrites = new List<ChannelPermissionOverwrite>
        {
            new()
            {
                TargetId = _userId,
                TargetType = OverwriteType.Member,
                Deny = Permissions.SendMessages
            }
        };

        // Act: Kiểm tra cho _otherUserId
        var otherPermissions = PermissionCalculator.CalculateChannelPermissions(
            _otherUserId, _ownerId, _everyoneRole, Enumerable.Empty<Role>(), overwrites);

        // Assert: _otherUserId không bị ảnh hưởng, vẫn có SendMessages từ @everyone
        PermissionCalculator.HasPermission(otherPermissions, Permissions.SendMessages).Should().BeTrue();
    }

    #endregion

    #region 7. Implicit ViewChannel Enforcement

    [Fact]
    public void CalculateChannelPermissions_WithoutViewChannel_AllOtherPermissionsMustBeZero()
    {
        // Arrange: User có role có toàn bộ quyền (Send, Embed, Attach...), nhưng kênh Deny ViewChannel
        var richRole = new Role
        {
            Id = Guid.NewGuid(),
            Permissions = Permissions.SendMessages | Permissions.EmbedLinks | Permissions.AttachFiles | Permissions.Connect
        };

        var overwrites = new List<ChannelPermissionOverwrite>
        {
            new()
            {
                TargetId = _everyoneRole.Id,
                TargetType = OverwriteType.Role,
                Deny = Permissions.ViewChannel
            }
        };

        // Act
        var permissions = PermissionCalculator.CalculateChannelPermissions(
            _userId, _ownerId, _everyoneRole, new[] { richRole }, overwrites);

        // Assert: Chuẩn Discord - không thấy kênh thì mọi quyền khác = None
        permissions.Should().Be(Permissions.None);
        PermissionCalculator.HasPermission(permissions, Permissions.SendMessages).Should().BeFalse();
        PermissionCalculator.HasPermission(permissions, Permissions.EmbedLinks).Should().BeFalse();
    }

    [Fact]
    public void CalculateChannelPermissions_WhenViewChannelRestoredByMemberOverwrite_PermissionsTakeEffect()
    {
        // Arrange: @everyone cấm ViewChannel, nhưng Member overwrite Allow ViewChannel
        var overwrites = new List<ChannelPermissionOverwrite>
        {
            new()
            {
                TargetId = _everyoneRole.Id,
                TargetType = OverwriteType.Role,
                Deny = Permissions.ViewChannel
            },
            new()
            {
                TargetId = _userId,
                TargetType = OverwriteType.Member,
                Allow = Permissions.ViewChannel
            }
        };

        // Act
        var permissions = PermissionCalculator.CalculateChannelPermissions(
            _userId, _ownerId, _everyoneRole, Enumerable.Empty<Role>(), overwrites);

        // Assert: ViewChannel được khôi phục, các quyền mặc định từ @everyone (SendMessages, v.v.) có tác dụng trở lại
        PermissionCalculator.HasPermission(permissions, Permissions.ViewChannel).Should().BeTrue();
        PermissionCalculator.HasPermission(permissions, Permissions.SendMessages).Should().BeTrue();
    }

    #endregion

    #region 8. Bitwise Helper Methods Tests

    [Theory]
    [InlineData(Permissions.SendMessages, Permissions.SendMessages, true)]
    [InlineData(Permissions.SendMessages | Permissions.ViewChannel, Permissions.SendMessages, true)]
    [InlineData(Permissions.ViewChannel, Permissions.SendMessages, false)]
    [InlineData(Permissions.None, Permissions.SendMessages, false)]
    [InlineData(Permissions.All, Permissions.Administrator, true)]
    public void HasPermission_ShouldEvaluateExactBitmask(Permissions current, Permissions required, bool expected)
    {
        PermissionCalculator.HasPermission(current, required).Should().Be(expected);
    }

    [Theory]
    [InlineData(Permissions.SendMessages, Permissions.SendMessages | Permissions.ViewChannel, true)]
    [InlineData(Permissions.ViewChannel, Permissions.SendMessages | Permissions.ViewChannel, true)]
    [InlineData(Permissions.KickMembers, Permissions.SendMessages | Permissions.ViewChannel, false)]
    [InlineData(Permissions.None, Permissions.SendMessages, false)]
    public void HasAnyPermission_ShouldEvaluateAnyOverlappingBit(Permissions current, Permissions candidates, bool expected)
    {
        PermissionCalculator.HasAnyPermission(current, candidates).Should().Be(expected);
    }

    [Fact]
    public void HasPermission_WhenMultipleRequiredBitsSpecified_ShouldRequireAllBits()
    {
        // Arrange
        var current = Permissions.ViewChannel | Permissions.SendMessages;
        var required = Permissions.ViewChannel | Permissions.SendMessages | Permissions.AttachFiles;

        // Act & Assert
        PermissionCalculator.HasPermission(current, required).Should().BeFalse("bị thiếu AttachFiles");
    }

    #endregion
}
