using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySales.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEsTemplateToRutaVendedor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "usuario_id",
                table: "RutasVendedor",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<bool>(
                name: "es_template",
                table: "RutasVendedor",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_Clientes_id_zona",
                table: "Clientes",
                column: "id_zona");

            migrationBuilder.AddForeignKey(
                name: "FK_Clientes_Zonas_id_zona",
                table: "Clientes",
                column: "id_zona",
                principalTable: "Zonas",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Clientes_Zonas_id_zona",
                table: "Clientes");

            migrationBuilder.DropIndex(
                name: "IX_Clientes_id_zona",
                table: "Clientes");

            migrationBuilder.DropColumn(
                name: "es_template",
                table: "RutasVendedor");

            migrationBuilder.AlterColumn<int>(
                name: "usuario_id",
                table: "RutasVendedor",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);
        }
    }
}
