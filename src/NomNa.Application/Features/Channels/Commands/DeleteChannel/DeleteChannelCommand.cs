using MediatR;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Channels.Commands.DeleteChannel;

public record DeleteChannelCommand(Guid ChannelId) : IRequest<Result<Unit>>;
