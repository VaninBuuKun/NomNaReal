using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Channels.DTOs;

namespace NomNa.Application.Features.Channels.Commands.AddChannelMember;

public record AddChannelMemberCommand(
    Guid ChannelId,
    Guid UserId
) : IRequest<Result<AddChannelMemberResultDto>>;
