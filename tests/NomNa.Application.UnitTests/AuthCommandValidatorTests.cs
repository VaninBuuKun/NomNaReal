using FluentAssertions;
using NomNa.Application.Features.Auth.Commands.ChangePassword;
using NomNa.Application.Features.Auth.Commands.Logout;
using NomNa.Application.Features.Auth.Commands.UpdateStatusPreference;
using NomNa.Domain.Enums;
using Xunit;

namespace NomNa.Application.UnitTests;

public class AuthCommandValidatorTests
{
    private readonly LogoutCommandValidator _logoutValidator = new();
    private readonly ChangePasswordCommandValidator _changePasswordValidator = new();
    private readonly UpdateStatusPreferenceCommandValidator _preferenceValidator = new();

    [Theory]
    [InlineData(UserStatusPreference.Online)]
    [InlineData(UserStatusPreference.Idle)]
    [InlineData(UserStatusPreference.DoNotDisturb)]
    [InlineData(UserStatusPreference.Invisible)]
    public void UpdateStatusPreferenceCommandValidator_Should_Pass_For_Valid_Enums(UserStatusPreference preference)
    {
        var command = new UpdateStatusPreferenceCommand(preference);
        var result = _preferenceValidator.Validate(command);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void UpdateStatusPreferenceCommandValidator_Should_Fail_For_Undefined_Enum()
    {
        var command = new UpdateStatusPreferenceCommand((UserStatusPreference)999);
        var result = _preferenceValidator.Validate(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Preference");
    }

    [Fact]
    public void LogoutCommandValidator_Should_Pass_When_Token_Is_Null_Or_Valid()
    {
        var commandNull = new LogoutCommand(null);
        var resultNull = _logoutValidator.Validate(commandNull);
        resultNull.IsValid.Should().BeTrue();

        var commandValid = new LogoutCommand("valid_refresh_token_string", true);
        var resultValid = _logoutValidator.Validate(commandValid);
        resultValid.IsValid.Should().BeTrue();
    }

    [Fact]
    public void LogoutCommandValidator_Should_Fail_When_Token_Exceeds_MaxLength()
    {
        var longToken = new string('a', 513);
        var command = new LogoutCommand(longToken);
        var result = _logoutValidator.Validate(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "RefreshToken");
    }

    [Fact]
    public void ChangePasswordCommandValidator_Should_Pass_For_Valid_Passwords()
    {
        var command = new ChangePasswordCommand("OldPassword123", "NewPassword123", "NewPassword123");
        var result = _changePasswordValidator.Validate(command);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void ChangePasswordCommandValidator_Should_Fail_When_Passwords_Mismatch()
    {
        var command = new ChangePasswordCommand("OldPassword123", "NewPassword123", "MismatchPassword");
        var result = _changePasswordValidator.Validate(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "ConfirmPassword");
    }

    [Fact]
    public void ChangePasswordCommandValidator_Should_Fail_When_NewPassword_Too_Short()
    {
        var command = new ChangePasswordCommand("OldPassword123", "12345", "12345");
        var result = _changePasswordValidator.Validate(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "NewPassword");
    }
}

