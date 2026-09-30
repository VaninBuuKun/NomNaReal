using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;

namespace NomNa.Application.Features.Messages.Commands.PinMessage;

public record PinMessageCommand(Guid MessageId) : IRequest<Result<PinnedMessageDto>>;
