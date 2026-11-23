using FluentAssertions;
using NomNa.Application.Features.Channels.Commands.UpdateChannelSlowmode;
using NomNa.Application.Features.Servers.Commands.BanServerMember;
using NomNa.Application.Features.Servers.Commands.TimeoutServerMember;
using NomNa.Application.Features.Servers.Commands.UnbanServerMember;
using Xunit;

namespace NomNa.Application.UnitTests;

public class ModerationCommandValidatorTests
{
    [Theory]
    [InlineData(0, true)]
    [InlineData(5, true)]
    [InlineData(60, true)]
    [InlineData(21600, true)]
    [InlineData(-1, false)]
    [InlineData(21601, false)]
    public void UpdateChannelSlowmodeCommandValidator_ValidatesRangeCorrectly(int seconds, bool expectedValid)
    {
        var validator = new UpdateChannelSlowmodeCommandValidator();
        var command = new UpdateChannelSlowmodeCommand(Guid.NewGuid(), seconds);

        var result = validator.Validate(command);

        result.IsValid.Should().Be(expectedValid);
    }

    [Theory]
    [InlineData(0, true)] // 0 = remove timeout
    [InlineData(5, true)]
    [InlineData(1440, true)] // 1 day
    [InlineData(40320, true)] // 28 days
    [InlineData(-1, false)]
    [InlineData(40321, false)]
    public void TimeoutServerMemberCommandValidator_ValidatesRangeCorrectly(int durationMinutes, bool expectedValid)
    {
        var validator = new TimeoutServerMemberCommandValidator();
        var command = new TimeoutServerMemberCommand(Guid.NewGuid(), Guid.NewGuid(), durationMinutes, "Spamming");

        var result = validator.Validate(command);

        result.IsValid.Should().Be(expectedValid);
    }

    [Fact]
    public void BanServerMemberCommandValidator_RequiresServerAndUser()
    {
        var validator = new BanServerMemberCommandValidator();
        var invalid = new BanServerMemberCommand(Guid.Empty, Guid.Empty);

        var result = validator.Validate(invalid);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "ServerId");
        result.Errors.Should().Contain(e => e.PropertyName == "MemberUserId");
    }

    [Fact]
    public void UnbanServerMemberCommandValidator_RequiresServerAndUser()
    {
        var validator = new UnbanServerMemberCommandValidator();
        var invalid = new UnbanServerMemberCommand(Guid.Empty, Guid.Empty);

        var result = validator.Validate(invalid);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "ServerId");
        result.Errors.Should().Contain(e => e.PropertyName == "UserId");
    }
}

