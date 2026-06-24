using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddZonaColorFrecuenciaYGeocerca : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "color",
                table: "Zonas",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "frecuencia_visita",
                table: "Zonas",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "geocerca_radio_metros",
                table: "company_settings",
                type: "integer",
                nullable: false,
                defaultValue: 80);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "color",
                table: "Zonas");

            migrationBuilder.DropColumn(
                name: "frecuencia_visita",
                table: "Zonas");

            migrationBuilder.DropColumn(
                name: "geocerca_radio_metros",
                table: "company_settings");
        }
    }
}
