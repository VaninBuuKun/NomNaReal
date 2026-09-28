using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NomNa.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class MakeChannelNameNullableAndAddLastMessageAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_channels_WorkspaceId_Name",
                table: "channels");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "channels",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastMessageAt",
                table: "channels",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_channels_LastMessageAt",
                table: "channels",
                column: "LastMessageAt");

            migrationBuilder.CreateIndex(
                name: "IX_channels_WorkspaceId_Name",
                table: "channels",
                columns: new[] { "WorkspaceId", "Name" },
                unique: true,
                filter: "\"Name\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_channels_LastMessageAt",
                table: "channels");

            migrationBuilder.DropIndex(
                name: "IX_channels_WorkspaceId_Name",
                table: "channels");

            migrationBuilder.DropColumn(
                name: "LastMessageAt",
                table: "channels");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "channels",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_channels_WorkspaceId_Name",
                table: "channels",
                columns: new[] { "WorkspaceId", "Name" },
                unique: true);
        }
    }
}
