using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AuditBackendFixes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "ImagenUrl",
                table: "Productos",
                newName: "imagen_url");

            migrationBuilder.AddColumn<int>(
                name: "SessionVersionAtCreation",
                table: "RefreshTokens",
                type: "integer",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "old_values",
                table: "activity_logs",
                type: "jsonb",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "json",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "new_values",
                table: "activity_logs",
                type: "jsonb",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "json",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "additional_data",
                table: "activity_logs",
                type: "jsonb",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "json",
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SessionVersionAtCreation",
                table: "RefreshTokens");

            migrationBuilder.RenameColumn(
                name: "imagen_url",
                table: "Productos",
                newName: "ImagenUrl");

            migrationBuilder.AlterColumn<string>(
                name: "old_values",
                table: "activity_logs",
                type: "json",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "jsonb",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "new_values",
                table: "activity_logs",
                type: "json",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "jsonb",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "additional_data",
                table: "activity_logs",
                type: "json",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "jsonb",
                oldNullable: true);
        }
    }
}
