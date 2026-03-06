using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySales.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantLocalizationSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "currency",
                table: "company_settings",
                type: "varchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "MXN")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "language",
                table: "company_settings",
                type: "varchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "es")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "theme",
                table: "company_settings",
                type: "varchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "light")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "timezone",
                table: "company_settings",
                type: "varchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "America/Mexico_City")
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "currency",
                table: "company_settings");

            migrationBuilder.DropColumn(
                name: "language",
                table: "company_settings");

            migrationBuilder.DropColumn(
                name: "theme",
                table: "company_settings");

            migrationBuilder.DropColumn(
                name: "timezone",
                table: "company_settings");
        }
    }
}
