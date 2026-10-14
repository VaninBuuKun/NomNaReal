using FluentValidation;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Channels.Commands.CreateChannel;

public class CreateChannelCommandValidator : AbstractValidator<CreateChannelCommand>
{
    public CreateChannelCommandValidator()
    {
        RuleFor(x => x.ServerId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);

        When(x => x.Type == ChannelType.Text, () =>
        {
            RuleFor(x => x.Name)
                .Matches(@"^[\p{L}0-9\-_ ]+$")
                .WithMessage("Tên kênh văn bản không được chứa ký tự đặc biệt.");
        });
    }
}

