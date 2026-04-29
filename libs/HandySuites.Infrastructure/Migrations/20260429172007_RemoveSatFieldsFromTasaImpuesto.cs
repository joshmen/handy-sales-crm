using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveSatFieldsFromTasaImpuesto : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "clave_sat",
                table: "TasasImpuesto");

            migrationBuilder.DropColumn(
                name: "tipo_impuesto",
                table: "TasasImpuesto");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "clave_sat",
                table: "TasasImpuesto",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "tipo_impuesto",
                table: "TasasImpuesto",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
