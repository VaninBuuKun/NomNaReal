using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;

namespace NomNa.Application.Features.Messages.Commands.ToggleReaction;

public record ToggleReactionCommand(
    Guid MessageId,
    string Emoji
) : IRequest<Result<ReactionUpdateDto>>;
