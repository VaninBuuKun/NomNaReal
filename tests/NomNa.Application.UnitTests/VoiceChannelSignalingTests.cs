using FluentAssertions;
using NomNa.Shared.Constants;
using NomNa.Shared.Models;
using Xunit;

namespace NomNa.Application.UnitTests;

public class VoiceChannelSignalingTests
{
    [Fact]
    public void VoiceParticipantPayload_Should_Initialize_Correctly()
    {
        var userId = Guid.NewGuid();
        var channelId = Guid.NewGuid();
        var displayName = "Vũ Nam";
        var avatarUrl = "https://cdn.nomna.com/avatar.webp";

        var payload = new VoiceParticipantPayload(
            userId,
            channelId,
            displayName,
            avatarUrl,
            IsMuted: false,
            IsDeafened: false,
            IsSpeaking: true,
            IsScreenSharing: false,
            IsCameraActive: true);

        payload.UserId.Should().Be(userId);
        payload.ChannelId.Should().Be(channelId);
        payload.DisplayName.Should().Be(displayName);
        payload.AvatarUrl.Should().Be(avatarUrl);
        payload.IsMuted.Should().BeFalse();
        payload.IsDeafened.Should().BeFalse();
        payload.IsSpeaking.Should().BeTrue();
        payload.IsScreenSharing.Should().BeFalse();
        payload.IsCameraActive.Should().BeTrue();
    }

    [Fact]
    public void VoiceStateChangedPayload_Should_Reflect_State_Transitions()
    {
        var channelId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        var payload = new VoiceStateChangedPayload(
            channelId,
            userId,
            IsMuted: true,
            IsDeafened: true,
            IsSpeaking: false,
            IsScreenSharing: true,
            IsCameraActive: false);

        payload.ChannelId.Should().Be(channelId);
        payload.UserId.Should().Be(userId);
        payload.IsMuted.Should().BeTrue();
        payload.IsDeafened.Should().BeTrue();
        payload.IsSpeaking.Should().BeFalse();
        payload.IsScreenSharing.Should().BeTrue();
        payload.IsCameraActive.Should().BeFalse();
    }

    [Fact]
    public void VoiceUserLeftPayload_Should_Contain_Identifiers()
    {
        var channelId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        var payload = new VoiceUserLeftPayload(channelId, userId);

        payload.ChannelId.Should().Be(channelId);
        payload.UserId.Should().Be(userId);
    }

    [Fact]
    public void VoiceSignalPayload_Should_Route_Sdp_Or_Candidate()
    {
        var channelId = Guid.NewGuid();
        var senderUserId = Guid.NewGuid();
        var targetUserId = Guid.NewGuid();
        var signalData = "{\"type\":\"offer\",\"sdp\":\"v=0...\"}";

        var payload = new VoiceSignalPayload(channelId, senderUserId, targetUserId, signalData);

        payload.ChannelId.Should().Be(channelId);
        payload.SenderUserId.Should().Be(senderUserId);
        payload.TargetUserId.Should().Be(targetUserId);
        payload.SignalData.Should().Be(signalData);
    }

    [Fact]
    public void SignalRConstants_Should_Have_Voice_Events_And_Methods()
    {
        SignalRConstants.Events.UserJoinedVoice.Should().Be("UserJoinedVoice");
        SignalRConstants.Events.UserLeftVoice.Should().Be("UserLeftVoice");
        SignalRConstants.Events.VoiceStateChanged.Should().Be("VoiceStateChanged");
        SignalRConstants.Events.CurrentVoiceParticipants.Should().Be("CurrentVoiceParticipants");
        SignalRConstants.Events.VoiceSignalReceived.Should().Be("VoiceSignalReceived");

        SignalRConstants.Methods.JoinVoiceChannel.Should().Be("JoinVoiceChannel");
        SignalRConstants.Methods.LeaveVoiceChannel.Should().Be("LeaveVoiceChannel");
        SignalRConstants.Methods.UpdateVoiceState.Should().Be("UpdateVoiceState");
        SignalRConstants.Methods.SendVoiceSignal.Should().Be("SendVoiceSignal");
        SignalRConstants.Methods.GetServerVoiceParticipants.Should().Be("GetServerVoiceParticipants");
    }
}
