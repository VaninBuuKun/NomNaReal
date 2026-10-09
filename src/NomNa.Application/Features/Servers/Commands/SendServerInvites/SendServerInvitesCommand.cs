using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Servers.DTOs;

namespace NomNa.Application.Features.Servers.Commands.SendServerInvites;

public record SendServerInvitesCommand(
    Guid ServerId,
    List<string> Emails
) : IRequest<Result<SendServerInvitesResultDto>>;

public record SendServerInvitesResultDto(
    int SentCount,
    List<string> SuccessfulEmails,
    List<string> AlreadyMemberEmails,
    List<string> FailedEmails
);
