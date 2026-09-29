using FluentValidation;

namespace NomNa.Application.Features.Messages.Commands.SendMessage;

public class SendMessageCommandValidator : AbstractValidator<SendMessageCommand>
{
    public SendMessageCommandValidator()
    {
        RuleFor(x => x.ChannelId).NotEmpty();

        RuleFor(x => x)
            .Must(x => !string.IsNullOrWhiteSpace(x.Content) || (x.Attachments != null && x.Attachments.Count > 0))
            .WithMessage("Message must contain text content or at least one attachment.");

        When(x => !string.IsNullOrEmpty(x.Content), () =>
        {
            RuleFor(x => x.Content!).MaximumLength(4000).WithMessage("Message content cannot exceed 4000 characters.");
        });

        When(x => x.Attachments != null && x.Attachments.Count > 0, () =>
        {
            RuleFor(x => x.Attachments!.Count)
                .LessThanOrEqualTo(10)
                .WithMessage("Cannot attach more than 10 files per message.");

            RuleForEach(x => x.Attachments).ChildRules(att =>
            {
                att.RuleFor(a => a.Url).NotEmpty().MaximumLength(2048).WithMessage("Attachment URL is required.");
                att.RuleFor(a => a.FileName).NotEmpty().MaximumLength(256).WithMessage("Attachment file name is required.");
            });
        });
    }
}
