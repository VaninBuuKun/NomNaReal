using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Channels.DTOs;

namespace NomNa.Application.Features.Channels.Commands.CreateOrGetDmChannel;

public record CreateOrGetDmChannelCommand(
    Guid ServerId,
    Guid TargetUserId
) : IRequest<Result<ChannelDto>>;
