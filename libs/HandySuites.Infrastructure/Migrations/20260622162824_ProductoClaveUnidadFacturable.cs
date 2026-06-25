using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ProductoClaveUnidadFacturable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "clave_unidad",
                table: "Productos",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "facturable",
                table: "Productos",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "clave_unidad",
                table: "Productos");

            migrationBuilder.DropColumn(
                name: "facturable",
                table: "Productos");
        }
    }
}
