# NomNa Database Architecture & Domain Entity Design

Visual documentation and Entity-Relationship diagram for the NomNa Chat & E-Learning/Classroom application.

## 1. Quick Ways to View the Database

- **Online Interactive Diagram (Recommended)**: Copy the contents of [`docs/database_schema.dbml`](file:///home/vanmuzic/Projects/ChatApp/docs/database_schema.dbml) and paste it into **[dbdiagram.io](https://dbdiagram.io)** or **[drawSQL.app](https://drawsql.app)** to immediately get an interactive, draggable visual ERD.
- **XML Schema Definition**: View [`docs/database_schema.xml`](file:///home/vanmuzic/Projects/ChatApp/docs/database_schema.xml) for standard XML table/column/relationship metadata.
- **Markdown / Mermaid Diagram**: Rendered right below in any Markdown previewer or on GitHub.

---

## 2. Mermaid Entity-Relationship Diagram

```mermaid
erDiagram
    User ||--o{ ClassroomMember : "joins"
    User ||--o{ ChannelMember : "joins"
    User ||--o{ Message : "sends"
    User ||--o{ MessageReaction : "reacts"
    User ||--o{ Notification : "receives"
    User ||--o{ StudyReminder : "owns"
    User ||--o{ RefreshToken : "holds"
    User ||--o{ Classroom : "owns"
    User ||--o{ TaskItem : "creates / assigned"
    User ||--o{ ClassroomItemSubmission : "submits"
    User ||--o{ ClassroomItemSubmission : "grades"

    Classroom ||--o{ ClassroomMember : "contains"
    Classroom ||--o{ Channel : "has"
    Classroom ||--o{ ClassScheduleItem : "schedules"
    Classroom ||--o{ TaskItem : "manages"
    Classroom ||--o{ ClassroomTopic : "organizes"
    Classroom ||--o{ ClassroomItem : "contains"

    ClassroomTopic ||--o{ ClassroomItem : "categorizes"
    ClassroomItem ||--o{ ClassroomItemSubmission : "receives"
    ClassroomItemSubmission ||--o{ SubmissionAttachmentItem : "attaches"

    Channel ||--o{ ChannelMember : "has"
    Channel ||--o{ Message : "contains"
    Channel ||--o{ ChannelPinnedMessage : "pins"
    Channel ||--o{ ClassScheduleItem : "associates"

    Message ||--o{ Message : "threads (parent-reply)"
    Message ||--o{ MessageReaction : "has"
    Message ||--o{ ChannelPinnedMessage : "is pinned as"

    User {
        Guid Id PK
        string UserName
        string Email
        string DisplayName
        string AvatarUrl
        string Bio
        int Status
        datetime CreatedAt
    }

    Classroom {
        Guid Id PK
        string Name
        string Description
        string IconUrl
        string InviteCode
        Guid OwnerId FK
        datetime CreatedAt
    }

    ClassroomTopic {
        Guid Id PK
        Guid ClassroomId FK
        string Title
        string Description
        int OrderIndex
        datetime CreatedAt
    }

    ClassroomItem {
        Guid Id PK
        Guid TopicId FK
        Guid ClassroomId FK
        string Title
        string Description
        int Type
        int OrderIndex
        string ResourceUrl
        datetime DueDate
        decimal MaxScore
    }

    ClassroomItemSubmission {
        Guid Id PK
        Guid ClassroomItemId FK
        Guid StudentId FK
        datetime SubmittedAt
        bool IsCompleted
        decimal Score
        string Feedback
        Guid GradedById FK
        datetime GradedAt
    }

    SubmissionAttachmentItem {
        Guid Id PK
        Guid SubmissionId FK
        string Url
        string FileName
        bigint FileSize
        string ContentType
    }

    ClassroomMember {
        Guid Id PK
        Guid ClassroomId FK
        Guid UserId FK
        int Role
        datetime JoinedAt
    }

    Channel {
        Guid Id PK
        Guid ClassroomId FK
        string Name
        int Type
        Guid CreatedById
        string LastMessageContent
        datetime LastMessageAt
    }

    ChannelMember {
        Guid Id PK
        Guid ChannelId FK
        Guid UserId FK
        datetime LastReadAt
    }

    Message {
        Guid Id PK
        Guid ChannelId FK
        Guid SenderId FK
        string Content
        Guid ThreadId FK
        int ReplyCount
        bool IsEdited
        jsonb Attachments
        datetime CreatedAt
    }

    MessageReaction {
        Guid Id PK
        Guid MessageId FK
        Guid UserId FK
        string Emoji
    }

    ChannelPinnedMessage {
        Guid Id PK
        Guid ChannelId FK
        Guid MessageId FK
        Guid PinnedById FK
        datetime PinnedAt
    }

    Notification {
        Guid Id PK
        Guid UserId FK
        int Type
        string Title
        string Body
        bool IsRead
    }

    TaskItem {
        Guid Id PK
        Guid ClassroomId FK
        Guid ChannelId FK
        Guid CreatedById FK
        Guid AssigneeId FK
        string Title
        int Status
        int Priority
        datetime DueDate
    }

    ClassScheduleItem {
        Guid Id PK
        Guid ClassroomId FK
        Guid ChannelId FK
        string Title
        string Subject
        int DayOfWeek
        time StartTime
        time EndTime
        string Location
    }

    StudyReminder {
        Guid Id PK
        Guid UserId FK
        string Title
        datetime RemindAt
        bool IsFired
    }
```
