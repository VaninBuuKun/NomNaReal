using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using NomNa.Application.Common.Models;
using NomNa.Infrastructure.Services;
using NomNa.Shared.Models;
using StackExchange.Redis;
using Xunit;

namespace NomNa.Application.UnitTests;

/// <summary>
/// Unit tests for distributed systems components:
/// - RedisVoiceRoomManager: Enforces Fail-Fast on disconnect to prevent Split-Brain across cluster nodes.
/// - RedisDistributedRateLimiter: Enforces Fail-Closed on disconnect to prevent DDoS attacks.
/// - RedisCallSignalingManager: Enforces Fail-Fast on disconnect for atomic WebRTC call reservations.
/// - Cache Invalidation Bus payloads.
/// </summary>
public class DistributedSystemsTests
{
    private readonly Mock<IConnectionMultiplexer> _redisMock = new();
    private readonly Mock<ILogger<RedisVoiceRoomManager>> _voiceLoggerMock = new();
    private readonly Mock<ILogger<RedisDistributedRateLimiter>> _rateLoggerMock = new();
    private readonly Mock<ILogger<RedisCallSignalingManager>> _callLoggerMock = new();

    public DistributedSystemsTests()
    {
        // By default simulate disconnected Redis to test consistency and fail-fast invariants
        _redisMock.Setup(r => r.IsConnected).Returns(false);
    }

    [Fact]
    public async Task VoiceRoomManager_WhenRedisDisconnected_Throws_InvalidOperationException()
    {
        // Arrange
        var manager = new RedisVoiceRoomManager(_redisMock.Object, _voiceLoggerMock.Object);
        var channelId = Guid.NewGuid();
        var serverId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        var participant = new VoiceParticipantPayload(
            userId,
            channelId,
            "Test User",
            null,
            IsMuted: false,
            IsDeafened: false,
            IsSpeaking: false,
            IsScreenSharing: false,
            IsCameraActive: false);

        // Act & Assert: Calling voice operations while disconnected must fail-fast to prevent split-brain
        var actSet = () => manager.SetUserVoiceAsync(channelId, serverId, participant);
        var actGet = () => manager.GetParticipantsAsync(channelId);
        var actChannel = () => manager.GetUserVoiceChannelAsync(userId);
        var actRemove = () => manager.RemoveUserVoiceAsync(userId, channelId);

        await actSet.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Distributed voice service is currently unavailable*");
        await actGet.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Distributed voice service is currently unavailable*");
        await actChannel.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Distributed voice service is currently unavailable*");
        await actRemove.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Distributed voice service is currently unavailable*");
    }

    [Fact]
    public async Task DistributedRateLimiter_WhenRedisDisconnected_FailsClosed()
    {
        // Arrange
        var limiter = new RedisDistributedRateLimiter(_redisMock.Object, _rateLoggerMock.Object);
        var key = $"test_key_{Guid.NewGuid()}";

        // Act: Redis is disconnected -> must fail closed (return true = rate limit exceeded) to prevent DDoS
        var isExceeded = await limiter.IsRateLimitExceededAsync(key, 5, TimeSpan.FromMinutes(1));

        // Assert
        isExceeded.Should().BeTrue("Fail-Closed architecture must block requests when rate limit coordinator is offline");
    }

    [Fact]
    public async Task CallSignalingManager_WhenRedisDisconnected_Throws_InvalidOperationException()
    {
        // Arrange
        var manager = new RedisCallSignalingManager(_redisMock.Object, _callLoggerMock.Object);
        var callerId = Guid.NewGuid();
        var targetId = Guid.NewGuid();

        // Act & Assert: Failing fast prevents ghost calls across desynchronized cluster nodes
        var actInitiate = () => manager.TryInitiateCallAsync(callerId, targetId, isVideo: false, TimeSpan.FromSeconds(30));
        var actHasActive = () => manager.HasActiveCallAsync(callerId);
        var actGetPartner = () => manager.GetCallPartnerAsync(callerId);
        var actVerify = () => manager.VerifyPendingCallAsync(callerId, targetId);
        var actCleanup = () => manager.CleanupCallForUserAsync(callerId);

        await actInitiate.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Distributed call signaling service is currently unavailable*");
        await actHasActive.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Distributed call signaling service is currently unavailable*");
        await actGetPartner.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Distributed call signaling service is currently unavailable*");
        await actVerify.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Distributed call signaling service is currently unavailable*");
        await actCleanup.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Distributed call signaling service is currently unavailable*");
    }

    [Fact]
    public async Task VoiceRoomManager_WhenRedisConnected_Returns_Participants_From_Redis()
    {
        // Arrange
        var connectedRedisMock = new Mock<IConnectionMultiplexer>();
        var databaseMock = new Mock<IDatabase>();

        connectedRedisMock.Setup(r => r.IsConnected).Returns(true);
        connectedRedisMock.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(databaseMock.Object);

        var channelId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var expectedParticipant = new VoiceParticipantPayload(
            userId,
            channelId,
            "Alice",
            "https://cdn.example.com/avatar.png",
            IsMuted: false,
            IsDeafened: false,
            IsSpeaking: false,
            IsScreenSharing: false,
            IsCameraActive: false);

        var json = JsonSerializer.Serialize(expectedParticipant);
        var hashEntries = new HashEntry[]
        {
            new HashEntry((RedisValue)userId.ToString(), (RedisValue)json)
        };

        databaseMock
            .Setup(db => db.HashGetAllAsync((RedisKey)$"nomna:voice:channel:{channelId}", It.IsAny<CommandFlags>()))
            .ReturnsAsync(hashEntries);

        var manager = new RedisVoiceRoomManager(connectedRedisMock.Object, _voiceLoggerMock.Object);

        // Act
        var participants = await manager.GetParticipantsAsync(channelId);

        // Assert
        participants.Should().ContainSingle(p => p.UserId == userId && p.DisplayName == "Alice");
    }

    [Fact]
    public async Task CallSignalingManager_WhenRedisConnected_Verifies_Pending_Call()
    {
        // Arrange
        var connectedRedisMock = new Mock<IConnectionMultiplexer>();
        var databaseMock = new Mock<IDatabase>();

        connectedRedisMock.Setup(r => r.IsConnected).Returns(true);
        connectedRedisMock.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(databaseMock.Object);

        var callerId = Guid.NewGuid();
        var targetId = Guid.NewGuid();

        databaseMock
            .Setup(db => db.HashGetAsync((RedisKey)$"nomna:call:user:{callerId}", (RedisValue)"partnerId", It.IsAny<CommandFlags>()))
            .ReturnsAsync((RedisValue)targetId.ToString());
        databaseMock
            .Setup(db => db.HashGetAsync((RedisKey)$"nomna:call:user:{callerId}", (RedisValue)"status", It.IsAny<CommandFlags>()))
            .ReturnsAsync((RedisValue)"ringing");

        var manager = new RedisCallSignalingManager(connectedRedisMock.Object, _callLoggerMock.Object);

        // Act
        var isVerified = await manager.VerifyPendingCallAsync(callerId, targetId);
        var isWrongTarget = await manager.VerifyPendingCallAsync(callerId, Guid.NewGuid());

        // Assert
        isVerified.Should().BeTrue();
        isWrongTarget.Should().BeFalse();
    }

    [Fact]
    public async Task DistributedRateLimiter_WhenRedisConnected_Evaluates_Script()
    {
        // Arrange
        var connectedRedisMock = new Mock<IConnectionMultiplexer>();
        var databaseMock = new Mock<IDatabase>();

        connectedRedisMock.Setup(r => r.IsConnected).Returns(true);
        connectedRedisMock.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(databaseMock.Object);

        // First call: returns 0 (not exceeded)
        databaseMock
            .SetupSequence(db => db.ScriptEvaluateAsync(
                It.IsAny<LuaScript>(),
                It.IsAny<object>(),
                It.IsAny<CommandFlags>()))
            .ReturnsAsync(RedisResult.Create((RedisValue)0))
            .ReturnsAsync(RedisResult.Create((RedisValue)1));

        var limiter = new RedisDistributedRateLimiter(connectedRedisMock.Object, _rateLoggerMock.Object);

        // Act
        var firstResult = await limiter.IsRateLimitExceededAsync("test_key", 10, TimeSpan.FromSeconds(1));
        var secondResult = await limiter.IsRateLimitExceededAsync("test_key", 10, TimeSpan.FromSeconds(1));

        // Assert
        firstResult.Should().BeFalse();
        secondResult.Should().BeTrue();
    }

    [Fact]
    public void CacheInvalidationMessage_Serialization_Should_Preserve_Payload()
    {
        // Arrange
        var entityId = Guid.NewGuid();
        var secondaryId = Guid.NewGuid();
        var message = new CacheInvalidationMessage(
            CacheInvalidationScope.UserPermissions,
            entityId,
            secondaryId);

        // Act
        var json = JsonSerializer.Serialize(message);
        var deserialized = JsonSerializer.Deserialize<CacheInvalidationMessage>(json);

        // Assert
        deserialized.Should().NotBeNull();
        deserialized!.Scope.Should().Be(CacheInvalidationScope.UserPermissions);
        deserialized.EntityId.Should().Be(entityId);
        deserialized.SecondaryId.Should().Be(secondaryId);
    }
}
