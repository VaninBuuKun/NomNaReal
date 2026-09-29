using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NomNa.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAttachmentsJsonAndChannelLastMessage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Attachments",
                table: "messages",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LastMessageContent",
                table: "channels",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "LastMessageSenderId",
                table: "channels",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql(@"
                UPDATE channels c
                SET ""LastMessageContent"" = (
                    SELECT SUBSTRING(m.""Content"", 1, 200)
                    FROM messages m
                    WHERE m.""ChannelId"" = c.""Id"" AND m.""ThreadId"" IS NULL AND m.""DeletedAt"" IS NULL
                    ORDER BY m.""CreatedAt"" DESC
                    LIMIT 1
                ),
                ""LastMessageSenderId"" = (
                    SELECT m.""SenderId""
                    FROM messages m
                    WHERE m.""ChannelId"" = c.""Id"" AND m.""ThreadId"" IS NULL AND m.""DeletedAt"" IS NULL
                    ORDER BY m.""CreatedAt"" DESC
                    LIMIT 1
                )
                WHERE c.""LastMessageContent"" IS NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Attachments",
                table: "messages");

            migrationBuilder.DropColumn(
                name: "LastMessageContent",
                table: "channels");

            migrationBuilder.DropColumn(
                name: "LastMessageSenderId",
                table: "channels");
        }
    }
}
