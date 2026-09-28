using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Channels.DTOs;

namespace NomNa.Application.Features.Channels.Commands.UpdateChannel;

public record UpdateChannelCommand(Guid ChannelId, string Name) : IRequest<Result<ChannelDto>>;
