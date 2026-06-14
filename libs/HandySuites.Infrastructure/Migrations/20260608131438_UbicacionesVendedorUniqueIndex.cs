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

            // 2026-06-14: DropIndex/CreateIndex de EF NO emiten IF [NOT] EXISTS,
            // lo que rompe en entornos frescos o con drift (DB cuyo schema esta
            // adelantado respecto a __EFMigrationsHistory). Visto en local: el
            // indice unico UQ ya existia y el IX no, asi que el DROP del IX
            // inexistente abortaba la migration (42704) y, de pasarlo, el CREATE
            // del UQ ya-existente fallaba (42P07). SQL crudo idempotente cubre
            // ambos casos: swap del indice no-unico por el unico, sin asumir
            // estado previo. Columnas en snake_case (sin comillas); tabla en
            // PascalCase entrecomillada.
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS ""IX_UbicacionesVendedor_tenant_usuario_capturado"";");
            migrationBuilder.Sql(@"
                CREATE UNIQUE INDEX IF NOT EXISTS ""UQ_UbicacionesVendedor_tenant_usuario_capturado""
                ON ""UbicacionesVendedor"" (tenant_id, usuario_id, capturado_en);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Reversa idempotente simetrica al Up.
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS ""UQ_UbicacionesVendedor_tenant_usuario_capturado"";");
            migrationBuilder.Sql(@"
                CREATE INDEX IF NOT EXISTS ""IX_UbicacionesVendedor_tenant_usuario_capturado""
                ON ""UbicacionesVendedor"" (tenant_id, usuario_id, capturado_en);
            ");
        }
    }
}
