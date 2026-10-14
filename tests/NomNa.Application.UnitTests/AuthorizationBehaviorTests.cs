using FluentAssertions;
using MediatR;
using Moq;
using NomNa.Application.Common.Behaviors;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Common.Security;
using NomNa.Domain.Enums;
using Xunit;

namespace NomNa.Application.UnitTests;

public class AuthorizationBehaviorTests
{
    private readonly Mock<ICurrentUserService> _currentUserServiceMock = new();
    private readonly Mock<IPermissionService> _permissionServiceMock = new();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _channelId = Guid.NewGuid();
    private readonly Guid _serverId = Guid.NewGuid();

    private record TestChannelCommand(Guid ChannelId, Permissions RequiredPermission) 
        : IRequest<Result<string>>, IRequireChannelPermission;

    private record TestServerCommand(Guid ServerId, Permissions RequiredPermission) 
        : IRequest<Result<string>>, IRequireServerPermission;

    private record TestNormalCommand() : IRequest<Result<string>>;

    [Fact]
    public async Task Handle_WhenRequestRequiresNoPermissions_ShouldCallNext()
    {
        // Arrange
        var behavior = new AuthorizationBehavior<TestNormalCommand, Result<string>>(
            _currentUserServiceMock.Object,
            _permissionServiceMock.Object
        );

        var request = new TestNormalCommand();
        var nextCalled = false;
        RequestHandlerDelegate<Result<string>> next = (ct) =>
        {
            nextCalled = true;
            return Task.FromResult(Result<string>.Success("ok"));
        };

        // Act
        var result = await behavior.Handle(request, next, CancellationToken.None);

        // Assert
        nextCalled.Should().BeTrue();
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be("ok");
    }

    [Fact]
    public async Task Handle_WhenUserNotAuthenticated_ShouldReturnUnauthorized()
    {
        // Arrange
        _currentUserServiceMock.Setup(s => s.UserId).Returns((Guid?)null);

        var behavior = new AuthorizationBehavior<TestChannelCommand, Result<string>>(
            _currentUserServiceMock.Object,
            _permissionServiceMock.Object
        );

        var request = new TestChannelCommand(_channelId, Permissions.SendMessages);
        var nextCalled = false;
        RequestHandlerDelegate<Result<string>> next = (ct) =>
        {
            nextCalled = true;
            return Task.FromResult(Result<string>.Success("ok"));
        };

        // Act
        var result = await behavior.Handle(request, next, CancellationToken.None);

        // Assert
        nextCalled.Should().BeFalse();
        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Unauthorized);
    }

    [Fact]
    public async Task Handle_WhenUserLacksChannelPermission_ShouldReturnForbidden()
    {
        // Arrange
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_userId);
        _permissionServiceMock.Setup(s => s.HasChannelPermissionAsync(
                _userId, _channelId, Permissions.SendMessages, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var behavior = new AuthorizationBehavior<TestChannelCommand, Result<string>>(
            _currentUserServiceMock.Object,
            _permissionServiceMock.Object
        );

        var request = new TestChannelCommand(_channelId, Permissions.SendMessages);
        var nextCalled = false;
        RequestHandlerDelegate<Result<string>> next = (ct) =>
        {
            nextCalled = true;
            return Task.FromResult(Result<string>.Success("ok"));
        };

        // Act
        var result = await behavior.Handle(request, next, CancellationToken.None);

        // Assert
        nextCalled.Should().BeFalse();
        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Forbidden);
    }

    [Fact]
    public async Task Handle_WhenUserHasChannelPermission_ShouldCallNext()
    {
        // Arrange
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_userId);
        _permissionServiceMock.Setup(s => s.HasChannelPermissionAsync(
                _userId, _channelId, Permissions.SendMessages, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var behavior = new AuthorizationBehavior<TestChannelCommand, Result<string>>(
            _currentUserServiceMock.Object,
            _permissionServiceMock.Object
        );

        var request = new TestChannelCommand(_channelId, Permissions.SendMessages);
        var nextCalled = false;
        RequestHandlerDelegate<Result<string>> next = (ct) =>
        {
            nextCalled = true;
            return Task.FromResult(Result<string>.Success("granted"));
        };

        // Act
        var result = await behavior.Handle(request, next, CancellationToken.None);

        // Assert
        nextCalled.Should().BeTrue();
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be("granted");
    }

    [Fact]
    public async Task Handle_WhenUserLacksServerPermission_ShouldReturnForbidden()
    {
        // Arrange
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_userId);
        _permissionServiceMock.Setup(s => s.HasServerPermissionAsync(
                _userId, _serverId, Permissions.ManageServer, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var behavior = new AuthorizationBehavior<TestServerCommand, Result<string>>(
            _currentUserServiceMock.Object,
            _permissionServiceMock.Object
        );

        var request = new TestServerCommand(_serverId, Permissions.ManageServer);
        var nextCalled = false;
        RequestHandlerDelegate<Result<string>> next = (ct) =>
        {
            nextCalled = true;
            return Task.FromResult(Result<string>.Success("ok"));
        };

        // Act
        var result = await behavior.Handle(request, next, CancellationToken.None);

        // Assert
        nextCalled.Should().BeFalse();
        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Forbidden);
    }
}
