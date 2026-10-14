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
app.UseCors("CorsPolicy");
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

// Health Check Endpoints (for Docker & Load Balancers)
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));
app.MapGet("/health/ready", async (ApplicationDbContext db) =>
{
    try
    {
        var canConnect = await db.Database.CanConnectAsync();
        return canConnect 
            ? Results.Ok(new { status = "ready", database = "connected" }) 
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
