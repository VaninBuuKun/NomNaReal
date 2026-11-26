using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Servers.DTOs;

namespace NomNa.Application.Features.Servers.Queries.GetServerAuditLogs;

public record GetServerAuditLogsQuery(
    Guid ServerId,
    int Limit = 50,
    Guid? BeforeId = null) : IRequest<Result<List<ServerAuditLogDto>>>;

