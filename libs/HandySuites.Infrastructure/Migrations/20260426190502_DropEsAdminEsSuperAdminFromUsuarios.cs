using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class DropEsAdminEsSuperAdminFromUsuarios : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "es_admin",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "es_super_admin",
                table: "Usuarios");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "es_admin",
                table: "Usuarios",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "es_super_admin",
                table: "Usuarios",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // Repopulate legacy booleans from rol column for rollback safety.
            migrationBuilder.Sql(@"
                UPDATE ""Usuarios""
                SET es_admin = (rol IN ('ADMIN','SUPER_ADMIN','SUPERVISOR')),
                    es_super_admin = (rol = 'SUPER_ADMIN');
            ");
        }
    }
}
