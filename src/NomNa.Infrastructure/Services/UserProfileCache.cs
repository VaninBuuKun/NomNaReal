using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;

namespace NomNa.Infrastructure.Services;

public class UserProfileCache : IUserProfileCache
{
    private readonly IMemoryCache _cache;
    private readonly IServiceScopeFactory _scopeFactory;
    private static readonly TimeSpan DefaultSlidingExpiration = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan DefaultAbsoluteExpiration = TimeSpan.FromHours(1);

    public UserProfileCache(IMemoryCache cache, IServiceScopeFactory scopeFactory)
    {
        _cache = cache;
        _scopeFactory = scopeFactory;
    }

    public async Task<UserProfileDto?> GetAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var cacheKey = GetCacheKey(userId);

        if (_cache.TryGetValue<UserProfileDto>(cacheKey, out var cached) && cached != null)
        {
            return cached;
        }

        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

        var user = await context.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new UserProfileDto(
                u.Id,
                u.DisplayName,
                u.UserName ?? string.Empty,
                u.AvatarUrl
            ))
            .FirstOrDefaultAsync(cancellationToken);

        if (user != null)
        {
            Set(user);
        }

        return user;
    }

    public void Invalidate(Guid userId)
    {
        _cache.Remove(GetCacheKey(userId));
    }

    public void Set(UserProfileDto profile)
    {
        var cacheKey = GetCacheKey(profile.Id);
        var options = new MemoryCacheEntryOptions
        {
            SlidingExpiration = DefaultSlidingExpiration,
            AbsoluteExpirationRelativeToNow = DefaultAbsoluteExpiration
        };
        _cache.Set(cacheKey, profile, options);
    }

    private static string GetCacheKey(Guid userId) => $"user_profile_{userId}";
}
