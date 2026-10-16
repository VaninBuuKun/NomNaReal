using FluentValidation;

namespace NomNa.Application.Features.Messages.Queries.SearchMessages;

public class SearchMessagesQueryValidator : AbstractValidator<SearchMessagesQuery>
{
    public SearchMessagesQueryValidator()
    {
        RuleFor(x => x)
            .Must(x => x.ServerId.HasValue || x.ChannelId.HasValue)
            .WithMessage("Phải cung cấp ServerId hoặc ChannelId để tìm kiếm.");

        RuleFor(x => x.Limit).InclusiveBetween(1, 100);

        RuleFor(x => x)
            .Must(x => !string.IsNullOrWhiteSpace(x.Keyword) || x.SenderId.HasValue || x.FromDate.HasValue || x.ToDate.HasValue)
            .WithMessage("Ít nhất một bộ lọc tìm kiếm (từ khóa, người gửi, hoặc khoảng thời gian) phải được cung cấp.");

        When(x => x.FromDate.HasValue && x.ToDate.HasValue, () =>
        {
            RuleFor(x => x.ToDate)
                .GreaterThanOrEqualTo(x => x.FromDate)
                .WithMessage("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.");
        });
    }
}
