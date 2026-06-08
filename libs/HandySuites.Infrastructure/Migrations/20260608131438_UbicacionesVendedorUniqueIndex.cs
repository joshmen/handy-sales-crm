using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UbicacionesVendedorUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Bug 2026-06-08 (GPS spam vendedor): el InsertBatchAsync hacia
            // query-then-insert con race window; staging tenia duplicates
            // exactos (mismo tenant+usuario+capturado_en, diferentes id).
            // Antes de aplicar el UNIQUE INDEX, eliminamos los duplicates
            // existentes manteniendo el id mas chico (oldest insert wins).
            // Es preparacion idempotente — si no hay duplicates, no-op.
            migrationBuilder.Sql(@"
                DELETE FROM ""UbicacionesVendedor"" a USING ""UbicacionesVendedor"" b
                WHERE a.id > b.id
                  AND a.tenant_id = b.tenant_id
                  AND a.usuario_id = b.usuario_id
                  AND a.capturado_en = b.capturado_en;
            ");

            migrationBuilder.DropIndex(
                name: "IX_UbicacionesVendedor_tenant_usuario_capturado",
                table: "UbicacionesVendedor");

            migrationBuilder.CreateIndex(
                name: "UQ_UbicacionesVendedor_tenant_usuario_capturado",
                table: "UbicacionesVendedor",
                columns: new[] { "tenant_id", "usuario_id", "capturado_en" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "UQ_UbicacionesVendedor_tenant_usuario_capturado",
                table: "UbicacionesVendedor");

            migrationBuilder.CreateIndex(
                name: "IX_UbicacionesVendedor_tenant_usuario_capturado",
                table: "UbicacionesVendedor",
                columns: new[] { "tenant_id", "usuario_id", "capturado_en" });
        }
    }
}
