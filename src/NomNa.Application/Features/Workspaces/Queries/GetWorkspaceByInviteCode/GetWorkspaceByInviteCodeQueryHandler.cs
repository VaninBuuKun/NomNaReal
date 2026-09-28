using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Workspaces.DTOs;

namespace NomNa.Application.Features.Workspaces.Queries.GetWorkspaceByInviteCode;

public class GetWorkspaceByInviteCodeQueryHandler : IRequestHandler<GetWorkspaceByInviteCodeQuery, Result<WorkspaceDto>>
{
    private readonly IApplicationDbContext _context;

    public GetWorkspaceByInviteCodeQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<WorkspaceDto>> Handle(GetWorkspaceByInviteCodeQuery request, CancellationToken cancellationToken)
    {
        var cleanCode = request.InviteCode.Trim();
        if (cleanCode.Contains('/'))
        {
            cleanCode = cleanCode.Split('/', StringSplitOptions.RemoveEmptyEntries).Last();
        }

        var workspace = await _context.Workspaces
            .AsNoTracking()
            .Include(w => w.Members)
            .FirstOrDefaultAsync(w => w.InviteCode.ToUpper() == cleanCode.ToUpper(), cancellationToken);

        if (workspace == null)
        {
            return Error.NotFound("Workspace.NotFound", "Không tìm thấy không gian làm việc với mã mời này.");
        }

        return new WorkspaceDto(
            workspace.Id,
            workspace.Name,
            workspace.Description,
            workspace.IconUrl,
            workspace.InviteCode,
            workspace.OwnerId,
            workspace.Members.Count
        );
    }
}
