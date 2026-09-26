namespace PulseChat.Shared.Constants;

public static class SignalRConstants
{
    public const string HubUrl = "/hubs/chat";

    public static class Events
    {
        public const string ReceiveMessage = "ReceiveMessage";
        public const string MessageEdited = "MessageEdited";
        public const string MessageDeleted = "MessageDeleted";
        public const string UserTyping = "UserTyping";
        public const string UserStoppedTyping = "UserStoppedTyping";
        public const string UserStatusChanged = "UserStatusChanged";
    }

    public static class Methods
    {
        public const string SendMessage = "SendMessage";
        public const string JoinChannel = "JoinChannel";
        public const string LeaveChannel = "LeaveChannel";
        public const string StartTyping = "StartTyping";
        public const string StopTyping = "StopTyping";
    }
}
