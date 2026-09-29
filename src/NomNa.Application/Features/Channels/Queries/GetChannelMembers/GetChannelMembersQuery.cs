using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Channels.DTOs;

namespace NomNa.Application.Features.Channels.Queries.GetChannelMembers;

public record GetChannelMembersQuery(Guid ChannelId) : IRequest<Result<List<ChannelMemberDto>>>;
