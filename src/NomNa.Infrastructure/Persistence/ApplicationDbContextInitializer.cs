using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NomNa.Domain.Entities;
using NomNa.Domain.Enums;

namespace NomNa.Infrastructure.Persistence;

public class ApplicationDbContextInitializer
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<User> _userManager;

    public ApplicationDbContextInitializer(ApplicationDbContext context, UserManager<User> userManager)
    {
        _context = context;
        _userManager = userManager;
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

        // 1. Seed Users via UserManager for proper Identity password hashing
        var alex = new User
        {
            Email = "alex@pulsechat.io",
            UserName = "alexrivers",
            DisplayName = "Alex Rivers",
            Status = UserStatus.Online,
            Bio = "Tech Lead & System Architect",
            EmailConfirmed = true
        };

        var minh = new User
        {
            Email = "minh@pulsechat.io",
            UserName = "minhdev",
            DisplayName = "Minh Dev",
            Status = UserStatus.Online,
            Bio = "Senior .NET Engineer",
            EmailConfirmed = true
        };

        var van = new User
        {
            Email = "van@pulsechat.io",
            UserName = "vannguyen",
            DisplayName = "Van Nguyen",
            Status = UserStatus.Online,
            Bio = "Fullstack Developer",
            EmailConfirmed = true
        };

        await _userManager.CreateAsync(alex, "Password123!");
        await _userManager.CreateAsync(minh, "Password123!");
        await _userManager.CreateAsync(van, "Password123!");

        // 2. Seed Workspace
        var workspace = new Workspace
        {
            Name = "Nexus Hub",
            Description = "Trung tâm làm việc & phát triển sản phẩm của team NomNa",
            IconUrl = "/default-avatar.png",
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
            Type = ChannelType.Text,
            CreatedById = alex.Id,
            Workspace = workspace
        };

        var backendChannel = new Channel
        {
            Name = "backend-net9",
            Type = ChannelType.Text,
            CreatedById = minh.Id,
            Workspace = workspace
        };

        var frontendChannel = new Channel
        {
            Name = "react-frontend",
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
