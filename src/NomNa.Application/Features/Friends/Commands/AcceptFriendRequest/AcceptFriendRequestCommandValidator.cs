using FluentValidation;

namespace NomNa.Application.Features.Friends.Commands.AcceptFriendRequest;

public class AcceptFriendRequestCommandValidator : AbstractValidator<AcceptFriendRequestCommand>
{
    public AcceptFriendRequestCommandValidator()
    {
        RuleFor(x => x.FriendshipId)
            .NotEmpty().WithMessage("Friendship ID is required.");
    }
}
