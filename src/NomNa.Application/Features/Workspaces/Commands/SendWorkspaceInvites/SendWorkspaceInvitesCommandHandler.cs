using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Workspaces.Commands.SendWorkspaceInvites;

public class SendWorkspaceInvitesCommandHandler : IRequestHandler<SendWorkspaceInvitesCommand, Result<SendWorkspaceInvitesResultDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IEmailService _emailService;

    public SendWorkspaceInvitesCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IEmailService emailService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _emailService = emailService;
    }

    public async Task<Result<SendWorkspaceInvitesResultDto>> Handle(SendWorkspaceInvitesCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        if (!currentUserId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var workspace = await _context.Workspaces
            .FirstOrDefaultAsync(w => w.Id == request.WorkspaceId, cancellationToken);

        if (workspace == null)
            return Error.NotFound("Workspace.NotFound", "Workspace không tồn tại.");

        // Verify current user is a member of the workspace
        var isMember = await _context.WorkspaceMembers
            .AnyAsync(m => m.WorkspaceId == request.WorkspaceId && m.UserId == currentUserId.Value, cancellationToken);

        if (!isMember)
            return Error.Forbidden("Workspace.Forbidden", "Bạn không có quyền mời thành viên vào Workspace này.");

        // Get sender profile for email signature
        var sender = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == currentUserId.Value, cancellationToken);
        var inviterName = sender?.DisplayName ?? sender?.UserName ?? "Thành viên NomNa";

        // Clean & deduplicate email list
        var targetEmails = request.Emails
            .Select(e => e.Trim().ToLowerInvariant())
            .Where(e => !string.IsNullOrWhiteSpace(e))
            .Distinct()
            .ToList();

        // Check which emails are already members of this workspace
        var existingMemberEmails = await _context.WorkspaceMembers
            .Where(wm => wm.WorkspaceId == request.WorkspaceId && wm.User.Email != null)
            .Select(wm => wm.User.Email!.ToLower())
            .ToListAsync(cancellationToken);

        var alreadyMemberEmails = targetEmails
            .Where(e => existingMemberEmails.Contains(e))
            .ToList();

        var pendingEmails = targetEmails
            .Where(e => !existingMemberEmails.Contains(e))
            .ToList();

        var successfulEmails = new List<string>();
        var failedEmails = new List<string>();

        foreach (var email in pendingEmails)
        {
            try
            {
                await _emailService.SendInviteEmailAsync(
                    email,
                    workspace.Name,
                    workspace.InviteCode,
                    inviterName,
                    cancellationToken: cancellationToken);

                successfulEmails.Add(email);
            }
            catch
            {
                failedEmails.Add(email);
            }
        }

        return new SendWorkspaceInvitesResultDto(
            successfulEmails.Count,
            successfulEmails,
            alreadyMemberEmails,
            failedEmails
        );
    }
}
