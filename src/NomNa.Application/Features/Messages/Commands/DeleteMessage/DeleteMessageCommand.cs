using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;

namespace NomNa.Application.Features.Messages.Commands.DeleteMessage;

public record DeleteMessageCommand(
    Guid MessageId
) : IRequest<Result<DeletedMessageDto>>;
