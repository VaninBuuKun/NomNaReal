using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Workspaces.DTOs;

namespace NomNa.Application.Features.Workspaces.Commands.SendWorkspaceInvites;

public record SendWorkspaceInvitesCommand(
    Guid WorkspaceId,
    List<string> Emails
) : IRequest<Result<SendWorkspaceInvitesResultDto>>;

public record SendWorkspaceInvitesResultDto(
    int SentCount,
    List<string> SuccessfulEmails,
    List<string> AlreadyMemberEmails,
    List<string> FailedEmails
);
