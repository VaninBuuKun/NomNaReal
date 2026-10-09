using FluentValidation;

namespace NomNa.Application.Features.Friends.Commands.DeclineFriendRequest;

public class DeclineFriendRequestCommandValidator : AbstractValidator<DeclineFriendRequestCommand>
{
    public DeclineFriendRequestCommandValidator()
    {
        RuleFor(x => x.FriendshipId)
            .NotEmpty().WithMessage("Friendship ID is required.");
    }
}
