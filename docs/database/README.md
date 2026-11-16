# 🗄️ NomNa — Database Architecture & Schema Hub

Thư mục này chứa toàn bộ tài liệu đặc tả cấu trúc cơ sở dữ liệu quan hệ (PostgreSQL 16) và các định dạng mô hình dữ liệu của NomNa:

## Danh Sách Tài Liệu

1. **[`database_schema.md`](./database_schema.md)**  
   Mô tả chi tiết bằng Markdown toàn bộ các bảng, khóa chính, khóa ngoại, kiểu dữ liệu, các ràng buộc (Constraints) và chỉ mục (Indexes) của hệ thống:
   - `Users`, `Roles`, `UserRoles` (ASP.NET Core Identity & Permission Bitmasks)
   - `Servers`, `Channels`, `ChannelOverwrites`, `ServerMembers`
   - `Messages`, `MessageAttachments`, `Reactions`, `DirectMessages`
   - `Friendships`, `FriendRequests`

2. **[`database_schema.dbml`](./database_schema.dbml)**  
   File định dạng DBML (Database Markup Language) dùng để trực quan hóa ERD trên [dbdiagram.io](https://dbdiagram.io).

3. **[`database_schema.xml`](./database_schema.xml)**  
   File lược đồ định dạng XML phục vụ cho các công cụ thiết kế cơ sở dữ liệu tự động hoặc reverse-engineering.

---
> **Lưu ý triển khai:** Mọi thay đổi về cấu trúc bảng phải tuân thủ nghiêm ngặt quy trình EF Core Migrations được định nghĩa trong `.agents/skills/be-architecture/SKILL.md`.

