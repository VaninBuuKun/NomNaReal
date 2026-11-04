using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NomNa.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UpdateUserStatusPreference : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Status",
                table: "users",
                newName: "StatusPreference");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "StatusPreference",
                table: "users",
                newName: "Status");
        }
    }
}
