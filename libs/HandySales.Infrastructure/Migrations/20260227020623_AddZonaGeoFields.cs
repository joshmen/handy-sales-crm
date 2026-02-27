using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySales.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddZonaGeoFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "centro_latitud",
                table: "Zonas",
                type: "double",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "centro_longitud",
                table: "Zonas",
                type: "double",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "radio_km",
                table: "Zonas",
                type: "double",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "centro_latitud",
                table: "Zonas");

            migrationBuilder.DropColumn(
                name: "centro_longitud",
                table: "Zonas");

            migrationBuilder.DropColumn(
                name: "radio_km",
                table: "Zonas");
        }
    }
}
