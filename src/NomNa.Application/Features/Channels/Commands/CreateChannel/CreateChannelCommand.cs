using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Channels.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Channels.Commands.CreateChannel;

public record CreateChannelCommand(
    Guid WorkspaceId,
    string Name,
    ChannelType Type = ChannelType.Text,
    bool IsPrivate = false
) : IRequest<Result<ChannelDto>>;
