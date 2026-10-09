using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Servers.Commands.SendServerInvites;

public class SendServerInvitesCommandHandler : IRequestHandler<SendServerInvitesCommand, Result<SendServerInvitesResultDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IEmailService _emailService;

    public SendServerInvitesCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IEmailService emailService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _emailService = emailService;
    }

    public async Task<Result<SendServerInvitesResultDto>> Handle(SendServerInvitesCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        if (!currentUserId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var server = await _context.Servers
            .FirstOrDefaultAsync(w => w.Id == request.ServerId, cancellationToken);

        if (server == null)
            return Error.NotFound("Server.NotFound", "Server không tồn tại.");

        // Verify current user is a member of the server
        var isMember = await _context.ServerMembers
            .AnyAsync(m => m.ServerId == request.ServerId && m.UserId == currentUserId.Value, cancellationToken);

        if (!isMember)
            return Error.Forbidden("Server.Forbidden", "Bạn không có quyền mời thành viên vào Server này.");

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

        // Check which emails are already members of this server
        var existingMemberEmails = await _context.ServerMembers
            .Where(wm => wm.ServerId == request.ServerId && wm.User.Email != null)
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
                    server.Name,
                    server.InviteCode,
                    inviterName,
                    cancellationToken: cancellationToken);

                successfulEmails.Add(email);
            }
            catch
            {
                failedEmails.Add(email);
            }
        }

        return new SendServerInvitesResultDto(
            successfulEmails.Count,
            successfulEmails,
            alreadyMemberEmails,
            failedEmails
        );
    }
}
