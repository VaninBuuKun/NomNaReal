using NomNa.Domain.Enums;

namespace NomNa.Application.Common.Security;

public interface IRequireChannelPermission
{
    Guid ChannelId { get; }
    Permissions RequiredPermission { get; }
}
