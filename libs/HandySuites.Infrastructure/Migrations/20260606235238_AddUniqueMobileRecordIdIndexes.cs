using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueMobileRecordIdIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Gastos_tenant_id_mobile_record_id",
                table: "Gastos");

            migrationBuilder.DropIndex(
                name: "IX_DevolucionesPedido_tenant_id_mobile_record_id",
                table: "DevolucionesPedido");

            migrationBuilder.CreateIndex(
                name: "IX_Pedidos_tenant_id_mobile_record_id",
                table: "Pedidos",
                columns: new[] { "tenant_id", "mobile_record_id" },
                unique: true,
                filter: "\"mobile_record_id\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Gastos_tenant_id_mobile_record_id",
                table: "Gastos",
                columns: new[] { "tenant_id", "mobile_record_id" },
                unique: true,
                filter: "\"mobile_record_id\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_DevolucionesPedido_tenant_id_mobile_record_id",
                table: "DevolucionesPedido",
                columns: new[] { "tenant_id", "mobile_record_id" },
                unique: true,
                filter: "\"mobile_record_id\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_DetallePedidos_pedido_id_mobile_record_id",
                table: "DetallePedidos",
                columns: new[] { "pedido_id", "mobile_record_id" },
                unique: true,
                filter: "\"mobile_record_id\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Cobros_tenant_id_mobile_record_id",
                table: "Cobros",
                columns: new[] { "tenant_id", "mobile_record_id" },
                unique: true,
                filter: "\"mobile_record_id\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ClienteVisitas_tenant_id_mobile_record_id",
                table: "ClienteVisitas",
                columns: new[] { "tenant_id", "mobile_record_id" },
                unique: true,
                filter: "\"mobile_record_id\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Clientes_tenant_id_mobile_record_id",
                table: "Clientes",
                columns: new[] { "tenant_id", "mobile_record_id" },
                unique: true,
                filter: "\"mobile_record_id\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Pedidos_tenant_id_mobile_record_id",
                table: "Pedidos");

            migrationBuilder.DropIndex(
                name: "IX_Gastos_tenant_id_mobile_record_id",
                table: "Gastos");

            migrationBuilder.DropIndex(
                name: "IX_DevolucionesPedido_tenant_id_mobile_record_id",
                table: "DevolucionesPedido");

            migrationBuilder.DropIndex(
                name: "IX_DetallePedidos_pedido_id_mobile_record_id",
                table: "DetallePedidos");

            migrationBuilder.DropIndex(
                name: "IX_Cobros_tenant_id_mobile_record_id",
                table: "Cobros");

            migrationBuilder.DropIndex(
                name: "IX_ClienteVisitas_tenant_id_mobile_record_id",
                table: "ClienteVisitas");

            migrationBuilder.DropIndex(
                name: "IX_Clientes_tenant_id_mobile_record_id",
                table: "Clientes");

            migrationBuilder.CreateIndex(
                name: "IX_Gastos_tenant_id_mobile_record_id",
                table: "Gastos",
                columns: new[] { "tenant_id", "mobile_record_id" });

            migrationBuilder.CreateIndex(
                name: "IX_DevolucionesPedido_tenant_id_mobile_record_id",
                table: "DevolucionesPedido",
                columns: new[] { "tenant_id", "mobile_record_id" });
        }
    }
}
