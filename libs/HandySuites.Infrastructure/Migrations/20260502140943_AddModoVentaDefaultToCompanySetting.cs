using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddModoVentaDefaultToCompanySetting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Default "Preguntar" para preservar comportamiento actual: el vendedor
            // sigue viendo la pantalla de Preventa vs VentaDirecta. Admin puede
            // cambiarlo desde /settings (web) cuando quiera acelerar el flujo.
            migrationBuilder.AddColumn<string>(
                name: "modo_venta_default",
                table: "company_settings",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Preguntar");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "modo_venta_default",
                table: "company_settings");
        }
    }
}
