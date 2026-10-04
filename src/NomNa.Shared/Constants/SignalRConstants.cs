namespace NomNa.Shared.Constants;

public static class SignalRConstants
{
    public const string HubUrl = "/hubs/chat";

    public static class Events
    {
        public const string ReceiveMessage = "ReceiveMessage";
        public const string MessageEdited = "MessageEdited";
        public const string MessageDeleted = "MessageDeleted";
        public const string ReceiveThreadReply = "ReceiveThreadReply";
        public const string ThreadReplyCountUpdated = "ThreadReplyCountUpdated";
        public const string ReceiveReactionUpdated = "ReceiveReactionUpdated";
        public const string UserTyping = "UserTyping";
        public const string UserStoppedTyping = "UserStoppedTyping";
        public const string UserStatusChanged = "UserStatusChanged";
        public const string AddedToChannel = "AddedToChannel";
        public const string ChannelMemberAdded = "ChannelMemberAdded";
        public const string WorkspaceMemberJoined = "WorkspaceMemberJoined";
        public const string MessagePinned = "MessagePinned";
        public const string MessageUnpinned = "MessageUnpinned";
        public const string ReceiveNotification = "ReceiveNotification";
        public const string NotificationCountUpdated = "NotificationCountUpdated";
        public const string TaskCreated = "TaskCreated";
        public const string TaskUpdated = "TaskUpdated";
        public const string TaskStatusChanged = "TaskStatusChanged";
        public const string TaskDeleted = "TaskDeleted";
    }

    public static class Methods
    {
        public const string SendMessage = "SendMessage";
        public const string EditMessage = "EditMessage";
        public const string DeleteMessage = "DeleteMessage";
        public const string ToggleReaction = "ToggleReaction";
        public const string JoinChannel = "JoinChannel";
        public const string LeaveChannel = "LeaveChannel";
        public const string JoinThread = "JoinThread";
        public const string LeaveThread = "LeaveThread";
        public const string SendThreadReply = "SendThreadReply";
        public const string StartTyping = "StartTyping";
        public const string StopTyping = "StopTyping";
        public const string GetOnlineUsers = "GetOnlineUsers";
    }
}
