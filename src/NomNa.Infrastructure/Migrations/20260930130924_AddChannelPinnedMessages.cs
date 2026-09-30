using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NomNa.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddChannelPinnedMessages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "channel_pinned_messages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChannelId = table.Column<Guid>(type: "uuid", nullable: false),
                    MessageId = table.Column<Guid>(type: "uuid", nullable: false),
                    PinnedById = table.Column<Guid>(type: "uuid", nullable: false),
                    PinnedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    OrderIndex = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_channel_pinned_messages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_channel_pinned_messages_channels_ChannelId",
                        column: x => x.ChannelId,
                        principalTable: "channels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_channel_pinned_messages_messages_MessageId",
                        column: x => x.MessageId,
                        principalTable: "messages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_channel_pinned_messages_users_PinnedById",
                        column: x => x.PinnedById,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_channel_pinned_messages_ChannelId_MessageId",
                table: "channel_pinned_messages",
                columns: new[] { "ChannelId", "MessageId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_channel_pinned_messages_ChannelId_OrderIndex",
                table: "channel_pinned_messages",
                columns: new[] { "ChannelId", "OrderIndex" });

            migrationBuilder.CreateIndex(
                name: "IX_channel_pinned_messages_MessageId",
                table: "channel_pinned_messages",
                column: "MessageId");

            migrationBuilder.CreateIndex(
                name: "IX_channel_pinned_messages_PinnedById",
                table: "channel_pinned_messages",
                column: "PinnedById");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "channel_pinned_messages");
        }
    }
}
