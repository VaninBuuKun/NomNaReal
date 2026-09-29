using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;

namespace NomNa.Application.Features.Messages.Queries.SearchMessages;

public record SearchMessagesQuery(
    Guid WorkspaceId,
    string? Keyword,
    Guid? ChannelId = null,
    Guid? SenderId = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    int Limit = 30
) : IRequest<Result<List<MessageDto>>>;
