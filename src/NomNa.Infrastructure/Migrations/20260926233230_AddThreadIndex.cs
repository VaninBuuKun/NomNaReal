using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NomNa.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddThreadIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_messages_ThreadId",
                table: "messages");

            migrationBuilder.CreateIndex(
                name: "IX_messages_ThreadId_CreatedAt",
                table: "messages",
                columns: new[] { "ThreadId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_messages_ThreadId_CreatedAt",
                table: "messages");

            migrationBuilder.CreateIndex(
                name: "IX_messages_ThreadId",
                table: "messages",
                column: "ThreadId");
        }
    }
}
