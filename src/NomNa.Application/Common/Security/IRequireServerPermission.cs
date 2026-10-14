using NomNa.Domain.Enums;

namespace NomNa.Application.Common.Security;

public interface IRequireServerPermission
{
    Guid ServerId { get; }
    Permissions RequiredPermission { get; }
}
