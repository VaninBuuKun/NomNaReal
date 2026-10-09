using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Servers.DTOs;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Servers.Commands.UpdateServer;

public class UpdateServerCommandHandler : IRequestHandler<UpdateServerCommand, Result<ServerDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public UpdateServerCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<ServerDto>> Handle(UpdateServerCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var server = await _context.Servers
            .Include(w => w.Members)
            .FirstOrDefaultAsync(w => w.Id == request.ServerId, cancellationToken);

        if (server == null)
            return Error.NotFound("Server.NotFound", "Server not found.");

        var currentMember = server.Members.FirstOrDefault(m => m.UserId == userId.Value);
        if (currentMember == null || (currentMember.Role != ServerRole.Owner && currentMember.Role != ServerRole.Admin))
            return Error.Forbidden("Server.Forbidden", "Only server owners or admins can update server settings.");

        server.Name = request.Name.Trim();
        server.Description = request.Description?.Trim();
        server.IconUrl = request.IconUrl?.Trim();

        await _context.SaveChangesAsync(cancellationToken);

        return new ServerDto(
            server.Id,
            server.Name,
            server.Description,
            server.IconUrl,
            server.InviteCode,
            server.OwnerId,
            server.Members.Count
        );
    }
}
