using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Servers.DTOs;

namespace NomNa.Application.Features.Servers.Queries.GetServerByInviteCode;

public class GetServerByInviteCodeQueryHandler : IRequestHandler<GetServerByInviteCodeQuery, Result<ServerDto>>
{
    private readonly IApplicationDbContext _context;

    public GetServerByInviteCodeQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<ServerDto>> Handle(GetServerByInviteCodeQuery request, CancellationToken cancellationToken)
    {
        var cleanCode = request.InviteCode.Trim();
        if (cleanCode.Contains('/'))
        {
            cleanCode = cleanCode.Split('/', StringSplitOptions.RemoveEmptyEntries).Last();
        }

        var server = await _context.Servers
            .AsNoTracking()
            .Include(w => w.Members)
            .FirstOrDefaultAsync(w => w.InviteCode.ToUpper() == cleanCode.ToUpper(), cancellationToken);

        if (server == null)
        {
            return Error.NotFound("Server.NotFound", "Không tìm thấy Server với mã mời này.");
        }

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
