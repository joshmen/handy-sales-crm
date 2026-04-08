using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddClaveSatToProductosYUnidades : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "clave_sat",
                table: "UnidadesMedida",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "clave_sat",
                table: "Productos",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "clave_sat",
                table: "UnidadesMedida");

            migrationBuilder.DropColumn(
                name: "clave_sat",
                table: "Productos");
        }
    }
}
