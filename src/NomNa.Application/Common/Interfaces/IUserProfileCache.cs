using NomNa.Application.Common.Models;

namespace NomNa.Application.Common.Interfaces;

public interface IUserProfileCache
{
    ValueTask<UserProfileDto?> GetAsync(Guid userId, CancellationToken cancellationToken = default);
    void Invalidate(Guid userId);
    void InvalidateLocal(Guid userId);
    void Set(UserProfileDto profile);
}
