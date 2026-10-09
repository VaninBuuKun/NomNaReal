using FluentValidation;

namespace NomNa.Application.Features.Friends.Commands.SendFriendRequest;

public class SendFriendRequestCommandValidator : AbstractValidator<SendFriendRequestCommand>
{
    public SendFriendRequestCommandValidator()
    {
        RuleFor(x => x.UsernameOrEmail)
            .NotEmpty().WithMessage("Vui lòng nhập tên người dùng hoặc email.")
            .MaximumLength(100).WithMessage("Tên người dùng không được vượt quá 100 ký tự.");
    }
}
