using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;

namespace NomNa.Application.Features.Messages.Commands.EditMessage;

public record EditMessageCommand(
    Guid MessageId,
    string Content
) : IRequest<Result<MessageEditedDto>>;
