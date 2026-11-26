using FluentAssertions;
using Moq;
using NomNa.Infrastructure.Services;
using StackExchange.Redis;
using Xunit;

namespace NomNa.Application.UnitTests;

public class ServerModerationSuiteTests
{
    private readonly Mock<IConnectionMultiplexer> _redisMock = new();
    private readonly Mock<IDatabase> _databaseMock = new();

    public ServerModerationSuiteTests()
    {
        _redisMock.Setup(r => r.IsConnected).Returns(true);
        _redisMock.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(_databaseMock.Object);
    }

    [Fact]
    public async Task SlowmodeService_WhenDurationZeroOrNegative_AllowsImmediatelyWithoutRedis()
    {
        // Arrange
        var service = new RedisChannelSlowmodeService(_redisMock.Object);
        var channelId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        // Act
        var (allowed, remainingSeconds) = await service.TryAcquireSlowmodeLeaseAsync(channelId, userId, 0);

        // Assert
        allowed.Should().BeTrue();
        remainingSeconds.Should().Be(0);
        _databaseMock.Verify(d => d.StringSetAsync(It.IsAny<RedisKey>(), It.IsAny<RedisValue>(), It.IsAny<TimeSpan?>(), It.IsAny<When>(), It.IsAny<CommandFlags>()), Times.Never);
    }

    [Fact]
    public async Task SlowmodeService_WhenRedisDown_FallsBackGracefully()
    {
        // Arrange
        _redisMock.Setup(r => r.IsConnected).Returns(false);
        var service = new RedisChannelSlowmodeService(_redisMock.Object);
        var channelId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        // Act
        var (allowed, remainingSeconds) = await service.TryAcquireSlowmodeLeaseAsync(channelId, userId, 10);

        // Assert
        allowed.Should().BeTrue();
        remainingSeconds.Should().Be(0);
    }

    [Fact]
    public async Task SlowmodeService_WhenKeyNotExists_AcquiresLeaseSuccessfully()
    {
        // Arrange
        var service = new RedisChannelSlowmodeService(_redisMock.Object);
        var channelId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        _databaseMock.Setup(d => d.StringSetAsync(
            It.IsAny<RedisKey>(),
            It.IsAny<RedisValue>(),
            It.IsAny<TimeSpan?>(),
            When.NotExists))
            .ReturnsAsync(true);

        // Act
        var (allowed, remainingSeconds) = await service.TryAcquireSlowmodeLeaseAsync(channelId, userId, 30);

        // Assert
        allowed.Should().BeTrue();
        remainingSeconds.Should().Be(0);
    }

    [Fact]
    public async Task SlowmodeService_WhenKeyAlreadyExists_ReturnsThrottledWithRemainingTtl()
    {
        // Arrange
        var service = new RedisChannelSlowmodeService(_redisMock.Object);
        var channelId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        _databaseMock.Setup(d => d.StringSetAsync(
            It.IsAny<RedisKey>(),
            It.IsAny<RedisValue>(),
            It.IsAny<TimeSpan?>(),
            When.NotExists))
            .ReturnsAsync(false);

        _databaseMock.Setup(d => d.KeyTimeToLiveAsync(It.IsAny<RedisKey>(), CommandFlags.None))
            .ReturnsAsync(TimeSpan.FromSeconds(14.2));

        // Act
        var (allowed, remainingSeconds) = await service.TryAcquireSlowmodeLeaseAsync(channelId, userId, 30);

        // Assert
        allowed.Should().BeFalse();
        remainingSeconds.Should().Be(15); // Ceiling of 14.2
    }
}
