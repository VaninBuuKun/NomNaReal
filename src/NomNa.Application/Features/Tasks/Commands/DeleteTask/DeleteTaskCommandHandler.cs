using MediatR;
using Microsoft.EntityFrameworkCore;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Tasks.Commands.DeleteTask;

public class DeleteTaskCommandHandler : IRequestHandler<DeleteTaskCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public DeleteTaskCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result> Handle(DeleteTaskCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        if (!currentUserId.HasValue)
        {
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");
        }

        var task = await _context.Tasks
            .FirstOrDefaultAsync(t => t.Id == request.TaskId, cancellationToken);

        if (task == null)
        {
            return Error.NotFound("Task.NotFound", "Công việc không tồn tại.");
        }

        var memberRole = await _context.WorkspaceMembers
            .Where(wm => wm.WorkspaceId == task.WorkspaceId && wm.UserId == currentUserId.Value)
            .Select(wm => (WorkspaceRole?)wm.Role)
            .FirstOrDefaultAsync(cancellationToken);

        if (!memberRole.HasValue)
        {
            return Error.Forbidden("Workspace.Forbidden", "Bạn không phải thành viên của không gian làm việc này.");
        }

        var isCreator = task.CreatedById == currentUserId.Value;
        var isManager = memberRole.Value == WorkspaceRole.Owner || memberRole.Value == WorkspaceRole.Admin;

        if (!isCreator && !isManager)
        {
            return Error.Forbidden("Task.Forbidden", "Chỉ người tạo hoặc quản trị viên mới có quyền xóa công việc này.");
        }

        _context.Tasks.Remove(task);
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
