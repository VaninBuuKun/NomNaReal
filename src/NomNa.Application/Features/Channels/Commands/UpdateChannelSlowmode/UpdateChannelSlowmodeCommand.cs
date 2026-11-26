using MediatR;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Channels.Commands.UpdateChannelSlowmode;

public record UpdateChannelSlowmodeCommand(
    Guid ChannelId,
    int SlowmodeSeconds) : IRequest<Result<Unit>>;

