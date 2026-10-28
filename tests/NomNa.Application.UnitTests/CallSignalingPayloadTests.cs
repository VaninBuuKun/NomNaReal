using FluentAssertions;
using NomNa.Shared.Constants;
using NomNa.Shared.Models;
using Xunit;

namespace NomNa.Application.UnitTests;

public class CallSignalingPayloadTests
{
    [Fact]
    public void CallOfferPayload_Should_Initialize_Correctly()
    {
        var callerId = Guid.NewGuid();
        var targetUserId = Guid.NewGuid();
        var sdp = "v=0\r\no=- 123456 2 IN IP4 127.0.0.1\r\ns=-\r\n";

        var payload = new CallOfferPayload(
            callerId,
            "Alice",
            "https://example.com/avatar.png",
            targetUserId,
            sdp,
            true);

        payload.CallerId.Should().Be(callerId);
        payload.CallerName.Should().Be("Alice");
        payload.CallerAvatar.Should().Be("https://example.com/avatar.png");
        payload.TargetUserId.Should().Be(targetUserId);
        payload.Sdp.Should().Be(sdp);
        payload.IsVideoCall.Should().BeTrue();
    }

    [Fact]
    public void CallAnswerPayload_Should_Initialize_Correctly()
    {
        var responderId = Guid.NewGuid();
        var callerId = Guid.NewGuid();
        var sdp = "v=0\r\no=- 654321 2 IN IP4 127.0.0.1\r\ns=-\r\n";

        var payload = new CallAnswerPayload(responderId, callerId, sdp);

        payload.ResponderId.Should().Be(responderId);
        payload.CallerId.Should().Be(callerId);
        payload.Sdp.Should().Be(sdp);
    }

    [Fact]
    public void IceCandidatePayload_Should_Initialize_Correctly()
    {
        var senderId = Guid.NewGuid();
        var targetUserId = Guid.NewGuid();
        var candidateJson = "{\"candidate\":\"candidate:1 1 UDP ...\",\"sdpMid\":\"0\",\"sdpMLineIndex\":0}";

        var payload = new IceCandidatePayload(senderId, targetUserId, candidateJson);

        payload.SenderId.Should().Be(senderId);
        payload.TargetUserId.Should().Be(targetUserId);
        payload.Candidate.Should().Be(candidateJson);
    }

    [Fact]
    public void CallSignalingConstants_Should_Define_Required_Events_And_Methods()
    {
        SignalRConstants.Events.CallIncoming.Should().Be("CallIncoming");
        SignalRConstants.Events.CallAccepted.Should().Be("CallAccepted");
        SignalRConstants.Events.CallRejected.Should().Be("CallRejected");
        SignalRConstants.Events.CallEnded.Should().Be("CallEnded");
        SignalRConstants.Events.ReceiveIceCandidate.Should().Be("ReceiveIceCandidate");

        SignalRConstants.Methods.StartCall.Should().Be("StartCall");
        SignalRConstants.Methods.AcceptCall.Should().Be("AcceptCall");
        SignalRConstants.Methods.RejectCall.Should().Be("RejectCall");
        SignalRConstants.Methods.EndCall.Should().Be("EndCall");
        SignalRConstants.Methods.SendIceCandidate.Should().Be("SendIceCandidate");
    }
}
