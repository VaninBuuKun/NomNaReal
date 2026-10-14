using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NomNa.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddChannelCategoriesAndTopic : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_channels_ServerId_Name",
                table: "channels");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "channels",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CategoryId",
                table: "channels",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Position",
                table: "channels",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Topic",
                table: "channels",
                type: "character varying(1024)",
                maxLength: 1024,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_channels_CategoryId",
                table: "channels",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_channels_ServerId_Position",
                table: "channels",
                columns: new[] { "ServerId", "Position" });

            migrationBuilder.AddForeignKey(
                name: "FK_channels_channels_CategoryId",
                table: "channels",
                column: "CategoryId",
                principalTable: "channels",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_channels_channels_CategoryId",
                table: "channels");

            migrationBuilder.DropIndex(
                name: "IX_channels_CategoryId",
                table: "channels");

            migrationBuilder.DropIndex(
                name: "IX_channels_ServerId_Position",
                table: "channels");

            migrationBuilder.DropColumn(
                name: "CategoryId",
                table: "channels");

            migrationBuilder.DropColumn(
                name: "Position",
                table: "channels");

            migrationBuilder.DropColumn(
                name: "Topic",
                table: "channels");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "channels",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_channels_ServerId_Name",
                table: "channels",
                columns: new[] { "ServerId", "Name" },
                unique: true,
                filter: "\"Name\" IS NOT NULL");
        }
    }
}
