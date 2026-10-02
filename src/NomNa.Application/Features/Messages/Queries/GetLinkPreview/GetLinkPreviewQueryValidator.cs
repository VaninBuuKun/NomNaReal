using FluentValidation;

namespace NomNa.Application.Features.Messages.Queries.GetLinkPreview;

public class GetLinkPreviewQueryValidator : AbstractValidator<GetLinkPreviewQuery>
{
    public GetLinkPreviewQueryValidator()
    {
        RuleFor(x => x.Url)
            .NotEmpty().WithMessage("URL không được để trống")
            .Must(uri => Uri.TryCreate(uri, UriKind.Absolute, out var parsed) &&
                         (parsed.Scheme == Uri.UriSchemeHttp || parsed.Scheme == Uri.UriSchemeHttps))
            .WithMessage("URL không hợp lệ hoặc giao thức không được hỗ trợ");
    }
}
