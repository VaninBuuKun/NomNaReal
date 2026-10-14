using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Common.Security;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.ChannelOverwrites.Commands.DeleteChannelOverwrite;

public record DeleteChannelOverwriteCommand(Guid ChannelId, Guid OverwriteId) 
    : IRequest<Result>, IRequireChannelPermission
{
    public Permissions RequiredPermission => Permissions.ManageChannels;
}
