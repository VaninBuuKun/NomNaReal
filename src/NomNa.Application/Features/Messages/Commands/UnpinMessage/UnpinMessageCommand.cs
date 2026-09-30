using MediatR;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Messages.Commands.UnpinMessage;

public record UnpinnedMessageResultDto(Guid ChannelId, Guid MessageId);

public record UnpinMessageCommand(Guid MessageId) : IRequest<Result<UnpinnedMessageResultDto>>;
