using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySales.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddClienteCamposCompletos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ciudad",
                table: "Clientes",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "codigo_postal",
                table: "Clientes",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "colonia",
                table: "Clientes",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "comentarios",
                table: "Clientes",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<decimal>(
                name: "descuento",
                table: "Clientes",
                type: "decimal(65,30)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "dias_credito",
                table: "Clientes",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "encargado",
                table: "Clientes",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<bool>(
                name: "es_prospecto",
                table: "Clientes",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "limite_credito",
                table: "Clientes",
                type: "decimal(65,30)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "lista_precios_id",
                table: "Clientes",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "saldo",
                table: "Clientes",
                type: "decimal(65,30)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "tipo_pago_predeterminado",
                table: "Clientes",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "tipos_pago_permitidos",
                table: "Clientes",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<decimal>(
                name: "venta_minima_efectiva",
                table: "Clientes",
                type: "decimal(65,30)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateIndex(
                name: "IX_Clientes_lista_precios_id",
                table: "Clientes",
                column: "lista_precios_id");

            migrationBuilder.AddForeignKey(
                name: "FK_Clientes_ListasPrecios_lista_precios_id",
                table: "Clientes",
                column: "lista_precios_id",
                principalTable: "ListasPrecios",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Clientes_ListasPrecios_lista_precios_id",
                table: "Clientes");

            migrationBuilder.DropIndex(
                name: "IX_Clientes_lista_precios_id",
                table: "Clientes");

            migrationBuilder.DropColumn(
                name: "ciudad",
                table: "Clientes");

            migrationBuilder.DropColumn(
                name: "codigo_postal",
                table: "Clientes");

            migrationBuilder.DropColumn(
                name: "colonia",
                table: "Clientes");

            migrationBuilder.DropColumn(
                name: "comentarios",
                table: "Clientes");

            migrationBuilder.DropColumn(
                name: "descuento",
                table: "Clientes");

            migrationBuilder.DropColumn(
                name: "dias_credito",
                table: "Clientes");

            migrationBuilder.DropColumn(
                name: "encargado",
                table: "Clientes");

            migrationBuilder.DropColumn(
                name: "es_prospecto",
                table: "Clientes");

            migrationBuilder.DropColumn(
                name: "limite_credito",
                table: "Clientes");

            migrationBuilder.DropColumn(
                name: "lista_precios_id",
                table: "Clientes");

            migrationBuilder.DropColumn(
                name: "saldo",
                table: "Clientes");

            migrationBuilder.DropColumn(
                name: "tipo_pago_predeterminado",
                table: "Clientes");

            migrationBuilder.DropColumn(
                name: "tipos_pago_permitidos",
                table: "Clientes");

            migrationBuilder.DropColumn(
                name: "venta_minima_efectiva",
                table: "Clientes");
        }
    }
}
