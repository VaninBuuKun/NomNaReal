using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Common.Security;
using NomNa.Application.Features.ChannelOverwrites.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.ChannelOverwrites.Commands.SetChannelOverwrite;

public record SetChannelOverwriteCommand(
    Guid ChannelId,
    Guid TargetId,
    OverwriteType TargetType,
    long Allow,
    long Deny
) : IRequest<Result<ChannelOverwriteDto>>, IRequireChannelPermission
{
    public Permissions RequiredPermission => Permissions.ManageChannels;
}
