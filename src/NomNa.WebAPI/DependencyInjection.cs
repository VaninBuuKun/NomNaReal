using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;
using Microsoft.IdentityModel.Tokens;
using NomNa.Application.Common.Interfaces;
using NomNa.WebAPI.Hubs;
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
        services.AddScoped<IRealtimeAccessRevoker, RealtimeAccessRevoker>();
        services.AddSingleton<SignalRRateLimitingHubFilter>();

        // 2. Framework Services
        services.AddControllers();

        var signalRBuilder = services.AddSignalR();
        signalRBuilder.AddHubOptions<ChatHub>(options =>
        {
            options.AddFilter<SignalRRateLimitingHubFilter>();
        });

        var redisConn = configuration.GetConnectionString("Redis") 
            ?? configuration["Redis"] 
            ?? "localhost:6380";

        if (!string.IsNullOrWhiteSpace(redisConn))
        {
            signalRBuilder.AddStackExchangeRedis(redisConn, options =>
            {
                options.Configuration.AbortOnConnectFail = false;
                options.Configuration.ConnectTimeout = 5000;
                options.Configuration.ChannelPrefix = StackExchange.Redis.RedisChannel.Literal("nomna_signalr");
            });
        }

        services.AddEndpointsApiExplorer();

        // Safe HTTP client registration
        services.AddHttpClient();
        services.AddHttpClient("LinkPreviewClient")
            .ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
            {
                AllowAutoRedirect = false,
                ConnectTimeout = TimeSpan.FromSeconds(3)
            });

        // SEC-04: Centralized Rate Limiting & CPU Bulkhead
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            // Strict sliding window for authentication to prevent brute force & PBKDF2 exhaustion
            options.AddPolicy("auth", httpContext =>
            {
                var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                return RateLimitPartition.GetSlidingWindowLimiter(ip, _ => new SlidingWindowRateLimiterOptions
                {
                    PermitLimit = 15,
                    Window = TimeSpan.FromMinutes(1),
                    SegmentsPerWindow = 6,
                    QueueLimit = 0
                });
            });

            // Token bucket policy for general API endpoints
            options.AddPolicy("api", httpContext =>
            {
                var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                return RateLimitPartition.GetTokenBucketLimiter(ip, _ => new TokenBucketRateLimiterOptions
                {
                    TokenLimit = 120,
                    ReplenishmentPeriod = TimeSpan.FromSeconds(1),
                    TokensPerPeriod = 2,
                    QueueLimit = 0
                });
            });
        });

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
        var jwtSecret = configuration["Jwt:Secret"];
        var defaultDevSecret = NomNa.Shared.Constants.AuthConstants.DefaultDevSecret;

        if (environment.IsProduction())
        {
            if (string.IsNullOrWhiteSpace(jwtSecret) || jwtSecret == defaultDevSecret || jwtSecret.Length < 32)
            {
                throw new InvalidOperationException(
                    "Production configuration error: 'Jwt:Secret' must be configured via environment variables and be at least 32 characters long.");
            }
        }

        jwtSecret ??= defaultDevSecret;
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
