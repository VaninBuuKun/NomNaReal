namespace NomNa.Shared.Constants;

public static class SignalRConstants
{
    public const string HubUrl = "/hubs/chat";

    public static class Events
    {
        public const string ReceiveMessage = "ReceiveMessage";
        public const string MessageEdited = "MessageEdited";
        public const string MessageDeleted = "MessageDeleted";
        public const string ReceiveReactionUpdated = "ReceiveReactionUpdated";
        public const string UserTyping = "UserTyping";
        public const string UserStoppedTyping = "UserStoppedTyping";
        public const string UserStatusChanged = "UserStatusChanged";
        public const string AddedToChannel = "AddedToChannel";
        public const string ChannelMemberAdded = "ChannelMemberAdded";
        public const string ServerMemberJoined = "ServerMemberJoined";
        public const string MessagePinned = "MessagePinned";
        public const string MessageUnpinned = "MessageUnpinned";
        public const string ReceiveNotification = "ReceiveNotification";
        public const string NotificationCountUpdated = "NotificationCountUpdated";
        public const string FriendRequestReceived = "FriendRequestReceived";
        public const string FriendRequestAccepted = "FriendRequestAccepted";
        public const string FriendshipRemoved = "FriendshipRemoved";
        public const string RemovedFromServer = "RemovedFromServer";
        public const string ServerMemberBanned = "ServerMemberBanned";
        public const string ServerMemberTimedOut = "ServerMemberTimedOut";
        public const string ChannelSlowmodeUpdated = "ChannelSlowmodeUpdated";
        public const string ChannelReadReceiptUpdated = "ChannelReadReceiptUpdated";

        // WebRTC 1v1 Call Signaling Events
        public const string CallIncoming = "CallIncoming";
        public const string CallAccepted = "CallAccepted";
        public const string CallRejected = "CallRejected";
        public const string CallEnded = "CallEnded";
        public const string ReceiveIceCandidate = "ReceiveIceCandidate";
        public const string UserBusy = "UserBusy";

        // Multi-user Voice Channel Signaling Events
        public const string UserJoinedVoice = "UserJoinedVoice";
        public const string UserLeftVoice = "UserLeftVoice";
        public const string VoiceStateChanged = "VoiceStateChanged";
        public const string CurrentVoiceParticipants = "CurrentVoiceParticipants";
        public const string VoiceSignalReceived = "VoiceSignalReceived";
    }

    public static class Methods
    {
        public const string SendMessage = "SendMessage";
        public const string EditMessage = "EditMessage";
        public const string DeleteMessage = "DeleteMessage";
        public const string ToggleReaction = "ToggleReaction";
        public const string JoinChannel = "JoinChannel";
        public const string LeaveChannel = "LeaveChannel";
        public const string StartTyping = "StartTyping";
        public const string StopTyping = "StopTyping";
        public const string GetOnlineUsers = "GetOnlineUsers";
        public const string SetStatusPreference = "SetStatusPreference";
        public const string JoinServer = "JoinServer";
        public const string LeaveServer = "LeaveServer";

        // WebRTC 1v1 Call Signaling Methods
        public const string StartCall = "StartCall";
        public const string AcceptCall = "AcceptCall";
        public const string RejectCall = "RejectCall";
        public const string EndCall = "EndCall";
        public const string SendIceCandidate = "SendIceCandidate";

        // Multi-user Voice Channel Signaling Methods
        public const string JoinVoiceChannel = "JoinVoiceChannel";
        public const string LeaveVoiceChannel = "LeaveVoiceChannel";
        public const string UpdateVoiceState = "UpdateVoiceState";
        public const string SendVoiceSignal = "SendVoiceSignal";
        public const string GetServerVoiceParticipants = "GetServerVoiceParticipants";
    }
}
