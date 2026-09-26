using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Channels.DTOs;

namespace NomNa.Application.Features.Channels.Queries.GetChannels;

public record GetChannelsQuery(Guid WorkspaceId) : IRequest<Result<List<ChannelDto>>>;
