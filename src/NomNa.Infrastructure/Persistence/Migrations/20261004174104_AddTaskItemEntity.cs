using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NomNa.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTaskItemEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "task_items",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WorkspaceId = table.Column<Guid>(type: "uuid", nullable: false),
                    ChannelId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Note = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    AttachmentUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CompletionNote = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Priority = table.Column<int>(type: "integer", nullable: false),
                    DueDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedById = table.Column<Guid>(type: "uuid", nullable: false),
                    AssigneeId = table.Column<Guid>(type: "uuid", nullable: true),
                    SourceMessageId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_task_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_task_items_channels_ChannelId",
                        column: x => x.ChannelId,
                        principalTable: "channels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_task_items_messages_SourceMessageId",
                        column: x => x.SourceMessageId,
                        principalTable: "messages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_task_items_users_AssigneeId",
                        column: x => x.AssigneeId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_task_items_users_CreatedById",
                        column: x => x.CreatedById,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_task_items_workspaces_WorkspaceId",
                        column: x => x.WorkspaceId,
                        principalTable: "workspaces",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_task_items_AssigneeId",
                table: "task_items",
                column: "AssigneeId");

            migrationBuilder.CreateIndex(
                name: "IX_task_items_ChannelId_Status",
                table: "task_items",
                columns: new[] { "ChannelId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_task_items_CreatedById",
                table: "task_items",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_task_items_DueDate",
                table: "task_items",
                column: "DueDate");

            migrationBuilder.CreateIndex(
                name: "IX_task_items_SourceMessageId",
                table: "task_items",
                column: "SourceMessageId");

            migrationBuilder.CreateIndex(
                name: "IX_task_items_WorkspaceId_Status",
                table: "task_items",
                columns: new[] { "WorkspaceId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "task_items");
        }
    }
}
