using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.ChannelOverwrites.Commands.DeleteChannelOverwrite;

public class DeleteChannelOverwriteCommandHandler : IRequestHandler<DeleteChannelOverwriteCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly IPermissionService _permissionService;

    public DeleteChannelOverwriteCommandHandler(IApplicationDbContext context, IPermissionService permissionService)
    {
        _context = context;
        _permissionService = permissionService;
    }

    public async Task<Result> Handle(DeleteChannelOverwriteCommand request, CancellationToken cancellationToken)
    {
        var overwrite = await _context.ChannelPermissionOverwrites
            .FirstOrDefaultAsync(o => o.Id == request.OverwriteId && o.ChannelId == request.ChannelId, cancellationToken);

        if (overwrite == null)
        {
            return Error.NotFound("Overwrite.NotFound", "Bản ghi overwrite không tồn tại.");
        }

        _context.ChannelPermissionOverwrites.Remove(overwrite);
        await _context.SaveChangesAsync(cancellationToken);

        _permissionService.InvalidateChannel(request.ChannelId);

        return Result.Success();
    }
}
