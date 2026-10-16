using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Channels.DTOs;

namespace NomNa.Application.Features.Channels.Queries.GetChannelById;

public record GetChannelByIdQuery(Guid ChannelId) : IRequest<Result<ChannelDto>>;
