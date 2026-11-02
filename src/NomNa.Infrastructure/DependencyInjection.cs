using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NomNa.Application.Common.Interfaces;
using NomNa.Domain.Entities;
using NomNa.Infrastructure.Persistence;
using NomNa.Infrastructure.Services;
using StackExchange.Redis;

namespace NomNa.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection") 
            ?? "Host=localhost;Port=5432;Database=NomNa;Username=postgres;Password=postgrespassword";

        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(connectionString, b => b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName)));

        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());
        services.AddScoped<ApplicationDbContextInitializer>();
        services.AddSingleton<IJwtService, JwtService>();
        services.AddScoped<IGoogleAuthService, GoogleAuthService>();
        services.AddScoped<IFileStorageService, S3FileStorageService>();
        services.AddScoped<IEmailService, EmailService>();
        // Redis Connection Multiplexer for distributed caching & presence tracking
        var redisConn = configuration.GetConnectionString("Redis") 
            ?? configuration["Redis"] 
            ?? "localhost:6380";

        services.AddSingleton<IConnectionMultiplexer>(_ =>
        {
            var options = ConfigurationOptions.Parse(redisConn);
            options.AbortOnConnectFail = false;
            options.ConnectTimeout = 5000;
            return ConnectionMultiplexer.Connect(options);
        });

        services.AddSingleton<IUserPresenceTracker, RedisUserPresenceTracker>();
        services.AddMemoryCache();
        services.AddSingleton<IUserProfileCache, UserProfileCache>();
        services.AddSingleton<IPinnedMessageCache, PinnedMessageCache>();
        services.AddScoped<IPermissionService, PermissionService>();

        // Configure ASP.NET Core Identity Core for Web API
        services.AddIdentityCore<User>(options =>
        {
            options.Password.RequireDigit = false;
            options.Password.RequiredLength = 6;
            options.Password.RequireNonAlphanumeric = false;
            options.Password.RequireUppercase = false;
            options.Password.RequireLowercase = false;
            options.User.RequireUniqueEmail = true;
            options.SignIn.RequireConfirmedEmail = false;
            options.Lockout.MaxFailedAccessAttempts = 5;
            options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        })
        .AddRoles<IdentityRole<Guid>>()
        .AddEntityFrameworkStores<ApplicationDbContext>()
        .AddDefaultTokenProviders();

        return services;
    }
}
