using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCompositeIndexesAndCorrelationId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "correlation_id",
                table: "ImpersonationSessions",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Pedidos_tenant_id_usuario_id_actualizado_en",
                table: "Pedidos",
                columns: new[] { "tenant_id", "usuario_id", "actualizado_en" });

            migrationBuilder.CreateIndex(
                name: "IX_Pedidos_tenant_id_usuario_id_creado_en",
                table: "Pedidos",
                columns: new[] { "tenant_id", "usuario_id", "creado_en" });

            migrationBuilder.CreateIndex(
                name: "IX_ImpersonationSessions_correlation_id",
                table: "ImpersonationSessions",
                column: "correlation_id");

            migrationBuilder.CreateIndex(
                name: "IX_Gastos_tenant_id_usuario_id_actualizado_en",
                table: "Gastos",
                columns: new[] { "tenant_id", "usuario_id", "actualizado_en" });

            migrationBuilder.CreateIndex(
                name: "IX_Gastos_tenant_id_usuario_id_creado_en",
                table: "Gastos",
                columns: new[] { "tenant_id", "usuario_id", "creado_en" });

            migrationBuilder.CreateIndex(
                name: "IX_Cobros_tenant_id_usuario_id_actualizado_en",
                table: "Cobros",
                columns: new[] { "tenant_id", "usuario_id", "actualizado_en" });

            migrationBuilder.CreateIndex(
                name: "IX_Cobros_tenant_id_usuario_id_creado_en",
                table: "Cobros",
                columns: new[] { "tenant_id", "usuario_id", "creado_en" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Pedidos_tenant_id_usuario_id_actualizado_en",
                table: "Pedidos");

            migrationBuilder.DropIndex(
                name: "IX_Pedidos_tenant_id_usuario_id_creado_en",
                table: "Pedidos");

            migrationBuilder.DropIndex(
                name: "IX_ImpersonationSessions_correlation_id",
                table: "ImpersonationSessions");

            migrationBuilder.DropIndex(
                name: "IX_Gastos_tenant_id_usuario_id_actualizado_en",
                table: "Gastos");

            migrationBuilder.DropIndex(
                name: "IX_Gastos_tenant_id_usuario_id_creado_en",
                table: "Gastos");

            migrationBuilder.DropIndex(
                name: "IX_Cobros_tenant_id_usuario_id_actualizado_en",
                table: "Cobros");

            migrationBuilder.DropIndex(
                name: "IX_Cobros_tenant_id_usuario_id_creado_en",
                table: "Cobros");

            migrationBuilder.DropColumn(
                name: "correlation_id",
                table: "ImpersonationSessions");
        }
    }
}
