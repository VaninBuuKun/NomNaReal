using MediatR;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Channels.Commands.MarkChannelAsRead;

public record MarkChannelAsReadCommand(Guid ChannelId) : IRequest<Result<Unit>>;
