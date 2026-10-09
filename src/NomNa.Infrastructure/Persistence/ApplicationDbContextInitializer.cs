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
            Email = "alex@nomna.local",
            UserName = "alexrivers",
            DisplayName = "Alex Rivers",
            Status = UserStatus.Online,
            Bio = "Tech Lead & System Architect",
            EmailConfirmed = true
        };

        var minh = new User
        {
            Email = "minh@nomna.local",
            UserName = "minhdev",
            DisplayName = "Minh Dev",
            Status = UserStatus.Online,
            Bio = "Senior .NET Engineer",
            EmailConfirmed = true
        };

        var van = new User
        {
            Email = "van@nomna.local",
            UserName = "vannguyen",
            DisplayName = "Van Nguyen",
            Status = UserStatus.Online,
            Bio = "Fullstack Developer",
            EmailConfirmed = true
        };

        await _userManager.CreateAsync(alex, "Password123!");
        await _userManager.CreateAsync(minh, "Password123!");
        await _userManager.CreateAsync(van, "Password123!");

        // 2. Seed Server
        var server = new Server
        {
            Name = "Nexus Hub",
            Description = "Trung tâm làm việc & phát triển sản phẩm của team NomNa",
            IconUrl = "/default-avatar.png",
            InviteCode = "NEXUS123",
            Owner = alex
        };

        server.Members.Add(new ServerMember { User = alex, Role = ServerRole.Owner });
        server.Members.Add(new ServerMember { User = minh, Role = ServerRole.Admin });
        server.Members.Add(new ServerMember { User = van, Role = ServerRole.Member });

        // 3. Seed Channels
        var generalChannel = new Channel
        {
            Name = "general",
            Type = ChannelType.Text,
            CreatedById = alex.Id,
            Server = server
        };

        var backendChannel = new Channel
        {
            Name = "backend-net9",
            Type = ChannelType.Text,
            CreatedById = minh.Id,
            Server = server
        };

        var frontendChannel = new Channel
        {
            Name = "react-frontend",
            Type = ChannelType.Text,
            CreatedById = van.Id,
            Server = server
        };

        // Add channel members
        foreach (var user in new[] { alex, minh, van })
        {
            generalChannel.Members.Add(new ChannelMember { User = user });
            backendChannel.Members.Add(new ChannelMember { User = user });
            frontendChannel.Members.Add(new ChannelMember { User = user });
        }

        server.Channels.Add(generalChannel);
        server.Channels.Add(backendChannel);
        server.Channels.Add(frontendChannel);

        _context.Servers.Add(server);

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

        // 5. Seed Friendships
        var friendship1 = new Friendship
        {
            Requester = alex,
            Addressee = minh,
            Status = FriendshipStatus.Accepted
        };

        var friendship2 = new Friendship
        {
            Requester = van,
            Addressee = alex,
            Status = FriendshipStatus.Pending
        };

        _context.Friendships.AddRange(friendship1, friendship2);

        var friendNotif = new Notification
        {
            User = alex,
            Actor = van,
            Type = NotificationType.FriendRequest,
            Title = $"{van.DisplayName} đã gửi cho bạn lời mời kết bạn",
            Content = $"@{van.UserName} muốn kết nối với bạn trên NomNa."
        };
        _context.Notifications.Add(friendNotif);


        await _context.SaveChangesAsync();
    }
}
