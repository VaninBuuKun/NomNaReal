using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.IdentityModel.Tokens;
using NomNa.Application.Common.Interfaces;
using NomNa.WebAPI.Services;

namespace NomNa.WebAPI;

public static class DependencyInjection
{
    public static IServiceCollection AddWebAPIServices(
        this IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        // 1. Context Accessor & Web-specific Service Implementations
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<INotificationDispatcher, SignalRNotificationDispatcher>();

        // 2. Framework Services
        services.AddControllers();
        services.AddSignalR();
        services.AddEndpointsApiExplorer();
        services.AddHttpClient();

        // 3. Configure Upload Limits (up to 105MB)
        services.Configure<FormOptions>(options =>
        {
            options.MultipartBodyLengthLimit = 105 * 1024 * 1024;
        });

        // 4. Configure CORS
        var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? new[] { "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://localhost:5174", "http://127.0.0.1:5174" };

        services.AddCors(options =>
        {
            options.AddPolicy("CorsPolicy", policy =>
            {
                policy.SetIsOriginAllowed(origin =>
                {
                    if (string.IsNullOrEmpty(origin)) return false;
                    if (environment.IsDevelopment())
                    {
                        if (Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                        {
                            if (uri.Host == "localhost" || uri.Host == "127.0.0.1") return true;
                        }
                    }
                    return allowedOrigins.Contains(origin);
                })
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
            });
        });

        // 5. Configure JWT Authentication & SignalR WebSocket Token Handling
        var jwtSecret = configuration["Jwt:Secret"] ?? "NomNaSuperSecretKeyForDevelopmentAndDemoPurposes2026!MustBeLongEnough";
        var key = Encoding.UTF8.GetBytes(jwtSecret);

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.RequireHttpsMetadata = false;
            options.SaveToken = true;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = configuration["Jwt:Issuer"] ?? "NomNa",
                ValidateAudience = true,
                ValidAudience = configuration["Jwt:Audience"] ?? "NomNaClient",
                ClockSkew = TimeSpan.Zero
            };

            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    // 1. Primary: HttpOnly cookie
                    if (context.Request.Cookies.TryGetValue("access_token", out var cookieToken) && !string.IsNullOrEmpty(cookieToken))
                    {
                        context.Token = cookieToken;
                    }
                    // 2. Fallback: Query string for SignalR WebSocket upgrades
                    else
                    {
                        var accessToken = context.Request.Query["access_token"];
                        var path = context.HttpContext.Request.Path;
                        if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                        {
                            context.Token = accessToken;
                        }
                    }

                    return Task.CompletedTask;
                }
            };
        });

        services.AddAuthorization();

        return services;
    }
}
