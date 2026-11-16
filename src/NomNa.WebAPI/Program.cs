using NomNa.Application;
using NomNa.Infrastructure;
using NomNa.Infrastructure.Persistence;
using NomNa.Shared.Constants;
using NomNa.WebAPI;
using NomNa.WebAPI.Hubs;
using NomNa.WebAPI.Middleware;

var builder = WebApplication.CreateBuilder(args);

// 1. Clean Architecture - Add Layer Services
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.AddWebAPIServices(builder.Configuration, builder.Environment);

// 2. Kestrel Server Configuration (File upload limits)
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 105 * 1024 * 1024; // 105MB
});

var app = builder.Build();

// 5. Database Migration and Seeding
using (var scope = app.Services.CreateScope())
{
    var initializer = scope.ServiceProvider.GetRequiredService<ApplicationDbContextInitializer>();
    await initializer.InitializeAsync();
    if (app.Environment.IsDevelopment())
    {
        await initializer.SeedAsync();
    }
}

// 6. Middleware Pipeline
app.UseMiddleware<ExceptionHandlingMiddleware>();

// Security Headers (OWASP recommendations)
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    await next();
});

app.UseCors("CorsPolicy");
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

// Health Check Endpoints (for Docker & Load Balancers)
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));
app.MapGet("/health/ready", async (ApplicationDbContext db, IServiceProvider sp) =>
{
    try
    {
        var canConnectDb = await db.Database.CanConnectAsync();
        var redis = sp.GetService<StackExchange.Redis.IConnectionMultiplexer>();
        var isRedisConnected = redis?.IsConnected ?? true;

        return (canConnectDb && isRedisConnected)
            ? Results.Ok(new { status = "ready", database = "connected", redis = isRedisConnected ? "connected" : "disconnected" }) 
            : Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
    }
    catch
    {
        return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
    }
});

app.MapControllers();
app.MapHub<ChatHub>(SignalRConstants.HubUrl);
app.MapFallbackToFile("index.html");

app.Run();

public partial class Program { }
