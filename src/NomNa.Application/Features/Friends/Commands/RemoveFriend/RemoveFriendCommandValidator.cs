using FluentValidation;

namespace NomNa.Application.Features.Friends.Commands.RemoveFriend;

public class RemoveFriendCommandValidator : AbstractValidator<RemoveFriendCommand>
{
    public RemoveFriendCommandValidator()
    {
        RuleFor(x => x.FriendshipId)
            .NotEmpty().WithMessage("Friendship ID is required.");
    }
}
