using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NomNa.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddReplyCountAndOptimizeIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_messages_ChannelId_CreatedAt",
                table: "messages");

            migrationBuilder.DropColumn(
                name: "JoinedAt",
                table: "workspace_members");

            migrationBuilder.DropColumn(
                name: "JoinedAt",
                table: "channel_members");

            migrationBuilder.AddColumn<int>(
                name: "ReplyCount",
                table: "messages",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql(
                @"UPDATE messages m
                  SET ""ReplyCount"" = COALESCE((
                      SELECT COUNT(*)
                      FROM messages r
                      WHERE r.""ThreadId"" = m.""Id"" AND r.""DeletedAt"" IS NULL
                  ), 0)
                  WHERE m.""ThreadId"" IS NULL;");

            migrationBuilder.CreateIndex(
                name: "idx_messages_channel_root_created",
                table: "messages",
                columns: new[] { "ChannelId", "CreatedAt" },
                filter: "\"DeletedAt\" IS NULL AND \"ThreadId\" IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "idx_messages_channel_root_created",
                table: "messages");

            migrationBuilder.DropColumn(
                name: "ReplyCount",
                table: "messages");

            migrationBuilder.AddColumn<DateTime>(
                name: "JoinedAt",
                table: "workspace_members",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "JoinedAt",
                table: "channel_members",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.CreateIndex(
                name: "IX_messages_ChannelId_CreatedAt",
                table: "messages",
                columns: new[] { "ChannelId", "CreatedAt" });
        }
    }
}
