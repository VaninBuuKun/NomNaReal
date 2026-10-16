using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NomNa.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceThreadWithQuoteReply : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_messages_messages_ThreadId",
                table: "messages");

            migrationBuilder.DropIndex(
                name: "idx_messages_channel_root_created",
                table: "messages");

            migrationBuilder.DropIndex(
                name: "IX_messages_ThreadId_CreatedAt",
                table: "messages");

            migrationBuilder.DropColumn(
                name: "ReplyCount",
                table: "messages");

            migrationBuilder.RenameColumn(
                name: "ThreadId",
                table: "messages",
                newName: "ReplyToMessageId");

            migrationBuilder.CreateIndex(
                name: "idx_messages_channel_root_created",
                table: "messages",
                columns: new[] { "ChannelId", "CreatedAt" },
                filter: "\"DeletedAt\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_messages_ReplyToMessageId",
                table: "messages",
                column: "ReplyToMessageId");

            migrationBuilder.AddForeignKey(
                name: "FK_messages_messages_ReplyToMessageId",
                table: "messages",
                column: "ReplyToMessageId",
                principalTable: "messages",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_messages_messages_ReplyToMessageId",
                table: "messages");

            migrationBuilder.DropIndex(
                name: "idx_messages_channel_root_created",
                table: "messages");

            migrationBuilder.DropIndex(
                name: "IX_messages_ReplyToMessageId",
                table: "messages");

            migrationBuilder.RenameColumn(
                name: "ReplyToMessageId",
                table: "messages",
                newName: "ThreadId");

            migrationBuilder.AddColumn<int>(
                name: "ReplyCount",
                table: "messages",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "idx_messages_channel_root_created",
                table: "messages",
                columns: new[] { "ChannelId", "CreatedAt" },
                filter: "\"DeletedAt\" IS NULL AND \"ThreadId\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_messages_ThreadId_CreatedAt",
                table: "messages",
                columns: new[] { "ThreadId", "CreatedAt" });

            migrationBuilder.AddForeignKey(
                name: "FK_messages_messages_ThreadId",
                table: "messages",
                column: "ThreadId",
                principalTable: "messages",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
