using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Roles.Commands.DeleteRole;

public class DeleteRoleCommandHandler : IRequestHandler<DeleteRoleCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly IPermissionService _permissionService;

    public DeleteRoleCommandHandler(IApplicationDbContext context, IPermissionService permissionService)
    {
        _context = context;
        _permissionService = permissionService;
    }

    public async Task<Result> Handle(DeleteRoleCommand request, CancellationToken cancellationToken)
    {
        var role = await _context.Roles
            .FirstOrDefaultAsync(r => r.Id == request.RoleId && r.ServerId == request.ServerId, cancellationToken);

        if (role == null)
        {
            return Error.NotFound("Role.NotFound", "Role không tồn tại trong server này.");
        }

        if (role.IsDefault)
        {
            return Error.Conflict("Role.CannotDeleteDefault", "Không thể xóa role @everyone mặc định của server.");
        }

        _context.Roles.Remove(role);
        await _context.SaveChangesAsync(cancellationToken);

        _permissionService.InvalidateServer(request.ServerId);

        return Result.Success();
    }
}
