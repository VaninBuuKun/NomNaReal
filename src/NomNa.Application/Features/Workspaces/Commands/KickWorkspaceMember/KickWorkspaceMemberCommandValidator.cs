using FluentValidation;

namespace NomNa.Application.Features.Workspaces.Commands.KickWorkspaceMember;

public class KickWorkspaceMemberCommandValidator : AbstractValidator<KickWorkspaceMemberCommand>
{
    public KickWorkspaceMemberCommandValidator()
    {
        RuleFor(x => x.WorkspaceId).NotEmpty();
        RuleFor(x => x.MemberUserId).NotEmpty();
    }
}
