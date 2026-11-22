using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;
using Microsoft.IdentityModel.Tokens;
using NomNa.Application.Common.Helpers;
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

        // Safe HTTP client registration with socket-level SSRF and DNS Rebinding defense
        services.AddHttpClient();
        services.AddHttpClient("LinkPreviewClient")
            .ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
            {
                AllowAutoRedirect = false,
                ConnectTimeout = TimeSpan.FromSeconds(3),
                ConnectCallback = async (context, cancellationToken) =>
                {
                    // Resolve DNS and inspect every IP before connecting to defeat TOCTOU DNS Rebinding attacks
                    var entry = await Dns.GetHostEntryAsync(context.DnsEndPoint.Host, cancellationToken);
                    if (entry.AddressList.Length == 0)
                    {
                        throw new SocketException((int)SocketError.HostNotFound);
                    }

                    foreach (var rawIp in entry.AddressList)
                    {
                        if (NetworkSecurityGuard.IsPrivateOrForbiddenIp(rawIp))
                        {
                            throw new InvalidOperationException($"SSRF Guard blocked connection attempt to forbidden IP: {rawIp}");
                        }
                    }

                    var socket = new Socket(SocketType.Stream, ProtocolType.Tcp)
                    {
                        NoDelay = true
                    };

                    try
                    {
                        await socket.ConnectAsync(entry.AddressList, context.DnsEndPoint.Port, cancellationToken);
                        return new NetworkStream(socket, ownsSocket: true);
                    }
                    catch
                    {
                        socket.Dispose();
                        throw;
                    }
                }
            });

        // SEC-04: Centralized Multi-Layer Rate Limiting & PBKDF2 Concurrency Bulkhead
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            options.OnRejected = async (context, token) =>
            {
                context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                {
                    context.HttpContext.Response.Headers.RetryAfter = Math.Max(1, (int)retryAfter.TotalSeconds).ToString();
                }
                await context.HttpContext.Response.WriteAsJsonAsync(new
                {
                    code = "RateLimit.Exceeded",
                    message = "Too many requests. Please wait before trying again."
                }, cancellationToken: token);
            };

            // Global Concurrency Bulkhead: Protects .NET ThreadPool against CPU starvation
            // caused by parallel PBKDF2 password hashing floods on auth endpoints.
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
            {
                var path = httpContext.Request.Path.Value ?? string.Empty;
                var isPasswordHashingEndpoint =
                    path.Contains("/api/auth/login", StringComparison.OrdinalIgnoreCase) ||
                    path.Contains("/api/auth/register", StringComparison.OrdinalIgnoreCase) ||
                    path.Contains("/api/auth/change-password", StringComparison.OrdinalIgnoreCase) ||
                    path.Contains("/api/auth/reset-password", StringComparison.OrdinalIgnoreCase);

                if (isPasswordHashingEndpoint)
                {
                    return RateLimitPartition.GetConcurrencyLimiter("global_pbkdf2_bulkhead", _ => new ConcurrencyLimiterOptions
                    {
                        PermitLimit = Math.Max(2, Environment.ProcessorCount * 2),
                        QueueLimit = 20,
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst
                    });
                }

                return RateLimitPartition.GetNoLimiter("no_bulkhead_limit");
            });

            // Strict sliding window for authentication to prevent credential brute force
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

            // Standalone CPU Bulkhead policy for explicit endpoint tagging
            options.AddConcurrencyLimiter("pbkdf2-bulkhead", opt =>
            {
                opt.PermitLimit = Math.Max(2, Environment.ProcessorCount * 2);
                opt.QueueLimit = 20;
                opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
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
