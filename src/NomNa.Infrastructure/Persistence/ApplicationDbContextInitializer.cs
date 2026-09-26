using Microsoft.EntityFrameworkCore;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;

namespace NomNa.Infrastructure.Persistence;

public class ApplicationDbContextInitializer
{
    private readonly ApplicationDbContext _context;

    public ApplicationDbContextInitializer(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task InitializeAsync()
    {
        try
        {
            // Auto-apply pending migrations
            if (_context.Database.IsRelational())
            {
                await _context.Database.MigrateAsync();
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"An error occurred while migrating the database: {ex.Message}");
            throw;
        }
    }

    public async Task SeedAsync()
    {
        if (await _context.Users.AnyAsync())
            return; // Already seeded

        var defaultPasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!");

        // 1. Seed Users
        var alex = new User
        {
            Email = "alex@pulsechat.io",
            Username = "alexrivers",
            DisplayName = "Alex Rivers",
            PasswordHash = defaultPasswordHash,
            Status = UserStatus.Online,
            Bio = "Tech Lead & System Architect"
        };

        var minh = new User
        {
            Email = "minh@pulsechat.io",
            Username = "minhdev",
            DisplayName = "Minh Dev",
            PasswordHash = defaultPasswordHash,
            Status = UserStatus.Online,
            Bio = "Senior .NET Engineer"
        };

        var van = new User
        {
            Email = "van@pulsechat.io",
            Username = "vannguyen",
            DisplayName = "Van Nguyen",
            PasswordHash = defaultPasswordHash,
            Status = UserStatus.Online,
            Bio = "Fullstack Developer"
        };

        _context.Users.AddRange(alex, minh, van);

        // 2. Seed Workspace
        var workspace = new Workspace
        {
            Name = "Nexus Hub",
            Description = "Trung tâm làm việc & phát triển sản phẩm của team NomNa",
            InviteCode = "NEXUS123",
            Owner = alex
        };

        workspace.Members.Add(new WorkspaceMember { User = alex, Role = WorkspaceRole.Owner });
        workspace.Members.Add(new WorkspaceMember { User = minh, Role = WorkspaceRole.Admin });
        workspace.Members.Add(new WorkspaceMember { User = van, Role = WorkspaceRole.Member });

        // 3. Seed Channels
        var generalChannel = new Channel
        {
            Name = "general",
            Topic = "Kênh trao đổi chung cho toàn bộ thành viên",
            Type = ChannelType.Text,
            CreatedById = alex.Id,
            Workspace = workspace
        };

        var backendChannel = new Channel
        {
            Name = "backend-net9",
            Topic = "Kiến trúc .NET 9, SignalR Hub & Performance",
            Type = ChannelType.Text,
            CreatedById = minh.Id,
            Workspace = workspace
        };

        var frontendChannel = new Channel
        {
            Name = "react-frontend",
            Topic = "React + Vite UI with Warm White Orange Theme",
            Type = ChannelType.Text,
            CreatedById = van.Id,
            Workspace = workspace
        };

        // Add channel members
        foreach (var user in new[] { alex, minh, van })
        {
            generalChannel.Members.Add(new ChannelMember { User = user });
            backendChannel.Members.Add(new ChannelMember { User = user });
            frontendChannel.Members.Add(new ChannelMember { User = user });
        }

        workspace.Channels.Add(generalChannel);
        workspace.Channels.Add(backendChannel);
        workspace.Channels.Add(frontendChannel);

        _context.Workspaces.Add(workspace);

        // 4. Seed Messages
        var msg1 = new Message
        {
            Channel = generalChannel,
            Sender = alex,
            Content = "Chào mừng mọi người đến với NomNa! Hệ thống Backend .NET 9 và SignalR đã sẵn sàng hoạt động.",
            CreatedAt = DateTime.UtcNow.AddMinutes(-20)
        };

        var msg2 = new Message
        {
            Channel = generalChannel,
            Sender = minh,
            Content = "SignalR Hub đã được cấu hình với JWT Authentication và tối ưu query qua IApplicationDbContext!",
            CreatedAt = DateTime.UtcNow.AddMinutes(-15)
        };

        var msg3 = new Message
        {
            Channel = generalChannel,
            Sender = van,
            Content = "Giao diện React với phong cách Trắng Cam ấm áp (Warm Light) trông rất êm mắt và hiện đại.",
            CreatedAt = DateTime.UtcNow.AddMinutes(-5)
        };

        _context.Messages.AddRange(msg1, msg2, msg3);

        await _context.SaveChangesAsync();
    }
}
