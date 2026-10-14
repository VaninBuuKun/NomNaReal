using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NomNa.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDiscordRolesAndPermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "channel_permission_overwrites",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChannelId = table.Column<Guid>(type: "uuid", nullable: false),
                    TargetId = table.Column<Guid>(type: "uuid", nullable: false),
                    TargetType = table.Column<int>(type: "integer", nullable: false),
                    Allow = table.Column<long>(type: "bigint", nullable: false),
                    Deny = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_channel_permission_overwrites", x => x.Id);
                    table.ForeignKey(
                        name: "FK_channel_permission_overwrites_channels_ChannelId",
                        column: x => x.ChannelId,
                        principalTable: "channels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "server_roles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ServerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Permissions = table.Column<long>(type: "bigint", nullable: false),
                    Position = table.Column<int>(type: "integer", nullable: false),
                    ColorHex = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    IsHoisted = table.Column<bool>(type: "boolean", nullable: false),
                    IsMentionable = table.Column<bool>(type: "boolean", nullable: false),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_server_roles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_server_roles_servers_ServerId",
                        column: x => x.ServerId,
                        principalTable: "servers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "member_roles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ServerMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_member_roles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_member_roles_server_members_ServerMemberId",
                        column: x => x.ServerMemberId,
                        principalTable: "server_members",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_member_roles_server_roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "server_roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_channel_permission_overwrites_ChannelId_TargetId_TargetType",
                table: "channel_permission_overwrites",
                columns: new[] { "ChannelId", "TargetId", "TargetType" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_member_roles_RoleId",
                table: "member_roles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_member_roles_ServerMemberId_RoleId",
                table: "member_roles",
                columns: new[] { "ServerMemberId", "RoleId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_server_roles_ServerId_Position",
                table: "server_roles",
                columns: new[] { "ServerId", "Position" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "channel_permission_overwrites");

            migrationBuilder.DropTable(
                name: "member_roles");

            migrationBuilder.DropTable(
                name: "server_roles");
        }
    }
}
