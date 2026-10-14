using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.ChannelOverwrites.DTOs;

namespace NomNa.Application.Features.ChannelOverwrites.Queries.GetChannelOverwrites;

public record GetChannelOverwritesQuery(Guid ChannelId) : IRequest<Result<List<ChannelOverwriteDto>>>;
