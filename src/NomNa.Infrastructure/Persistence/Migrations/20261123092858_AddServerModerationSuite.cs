using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NomNa.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddServerModerationSuite : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CommunicationDisabledUntil",
                table: "server_members",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SlowmodeSeconds",
                table: "channels",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "server_audit_logs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ServerId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActorId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActionType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    TargetId = table.Column<Guid>(type: "uuid", nullable: true),
                    TargetName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ChangesJson = table.Column<string>(type: "jsonb", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_server_audit_logs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_server_audit_logs_servers_ServerId",
                        column: x => x.ServerId,
                        principalTable: "servers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_server_audit_logs_users_ActorId",
                        column: x => x.ActorId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "server_bans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ServerId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    BannedById = table.Column<Guid>(type: "uuid", nullable: false),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_server_bans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_server_bans_servers_ServerId",
                        column: x => x.ServerId,
                        principalTable: "servers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_server_bans_users_BannedById",
                        column: x => x.BannedById,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_server_bans_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_server_audit_logs_ActorId",
                table: "server_audit_logs",
                column: "ActorId");

            migrationBuilder.CreateIndex(
                name: "IX_server_audit_logs_ServerId_CreatedAt",
                table: "server_audit_logs",
                columns: new[] { "ServerId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_server_bans_BannedById",
                table: "server_bans",
                column: "BannedById");

            migrationBuilder.CreateIndex(
                name: "IX_server_bans_ServerId_UserId",
                table: "server_bans",
                columns: new[] { "ServerId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_server_bans_UserId",
                table: "server_bans",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "server_audit_logs");

            migrationBuilder.DropTable(
                name: "server_bans");

            migrationBuilder.DropColumn(
                name: "CommunicationDisabledUntil",
                table: "server_members");

            migrationBuilder.DropColumn(
                name: "SlowmodeSeconds",
                table: "channels");
        }
    }
}
