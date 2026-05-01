using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPromocionRegaloYCantidadBonificada : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "cantidad_bonificada",
                table: "Promociones",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "cantidad_compra",
                table: "Promociones",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "producto_bonificado_id",
                table: "Promociones",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "tipo_promocion",
                table: "Promociones",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "cantidad_bonificada",
                table: "DetallePedidos",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateIndex(
                name: "IX_Promociones_producto_bonificado_id",
                table: "Promociones",
                column: "producto_bonificado_id");

            migrationBuilder.AddForeignKey(
                name: "FK_Promociones_Productos_producto_bonificado_id",
                table: "Promociones",
                column: "producto_bonificado_id",
                principalTable: "Productos",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Promociones_Productos_producto_bonificado_id",
                table: "Promociones");

            migrationBuilder.DropIndex(
                name: "IX_Promociones_producto_bonificado_id",
                table: "Promociones");

            migrationBuilder.DropColumn(
                name: "cantidad_bonificada",
                table: "Promociones");

            migrationBuilder.DropColumn(
                name: "cantidad_compra",
                table: "Promociones");

            migrationBuilder.DropColumn(
                name: "producto_bonificado_id",
                table: "Promociones");

            migrationBuilder.DropColumn(
                name: "tipo_promocion",
                table: "Promociones");

            migrationBuilder.DropColumn(
                name: "cantidad_bonificada",
                table: "DetallePedidos");
        }
    }
}
