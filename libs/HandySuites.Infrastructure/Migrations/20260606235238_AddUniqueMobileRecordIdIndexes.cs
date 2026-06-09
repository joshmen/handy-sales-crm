using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueMobileRecordIdIndexes : Migration
    {
        // Sprint correctivo 2026-06-06: reescrita la migration para usar
        // `CREATE UNIQUE INDEX CONCURRENTLY` (Postgres-only). Sin
        // CONCURRENTLY, EF Core hace LOCK exclusivo durante la creacion
        // del index — en tablas con millones de rows (Pedidos en prod),
        // bloquea writes durante minutos y posiblemente timeout del
        // deployment. CONCURRENTLY permite que reads+writes sigan
        // ocurriendo mientras el index se construye, a costo de:
        //   - El index tarda mas en construirse (2 passes vs 1).
        //   - NO se puede correr dentro de transaccion EF (ver
        //     SuppressTransaction abajo).
        //
        // Si una transaccion concurrente inserta duplicados ANTES de que
        // el index termine de construirse, el CREATE INDEX falla con
        // "could not create unique index" y queda en estado INVALID.
        // En ese caso: hacer cleanup de duplicados +
        // `REINDEX INDEX CONCURRENTLY <name>`.
        //
        // Para correr esta migration:
        //   dotnet ef database update --connection <staging-conn-string>
        // En Down: usar `DROP INDEX CONCURRENTLY` por la misma razon.

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // PATCH 2026-06-09 (post-prod deploy failure): producción tenía
            // duplicados historicos (sync bug pre-idempotency #14) que
            // hacian fallar el CREATE UNIQUE INDEX con 23505. Staging no
            // tenia duplicados, por eso paso ahi sin issue. Como la
            // migration NO se marca aplicada en prod (fallo el primer try),
            // EF la re-correra con el nuevo SQL en el proximo deploy.
            //
            // Policy: "keep newest" — para cada grupo (clave_natural,
            // mobile_record_id), conservar el id MAX (ultimo insert =
            // version mas reciente del cliente offline) y DELETE el resto.
            // Los duplicados son writes idempotentes que el cliente reenvio
            // sin que el server tuviera el guard pre-#14. La version mas
            // nueva es la fuente de verdad.
            //
            // Dedup cubre TODAS las 7 tablas, no solo DetallePedidos, por
            // defensa en profundidad (latent dups en otras tablas
            // bloquearian la migration en futuras restoraciones).
            //
            // suppressTransaction:true mantiene consistencia con el resto
            // del migration (CREATE INDEX CONCURRENTLY abajo no puede
            // estar en transaction). Postgres ejecuta cada DELETE en
            // autocommit individual.
            migrationBuilder.Sql(@"
                DELETE FROM ""DetallePedidos"" WHERE id IN (
                    SELECT id FROM (
                        SELECT id, ROW_NUMBER() OVER (
                            PARTITION BY pedido_id, mobile_record_id ORDER BY id DESC
                        ) AS rn
                        FROM ""DetallePedidos""
                        WHERE mobile_record_id IS NOT NULL
                    ) ranked WHERE rn > 1
                );", suppressTransaction: true);

            migrationBuilder.Sql(@"
                DELETE FROM ""Pedidos"" WHERE id IN (
                    SELECT id FROM (
                        SELECT id, ROW_NUMBER() OVER (
                            PARTITION BY tenant_id, mobile_record_id ORDER BY id DESC
                        ) AS rn
                        FROM ""Pedidos""
                        WHERE mobile_record_id IS NOT NULL
                    ) ranked WHERE rn > 1
                );", suppressTransaction: true);

            migrationBuilder.Sql(@"
                DELETE FROM ""Gastos"" WHERE id IN (
                    SELECT id FROM (
                        SELECT id, ROW_NUMBER() OVER (
                            PARTITION BY tenant_id, mobile_record_id ORDER BY id DESC
                        ) AS rn
                        FROM ""Gastos""
                        WHERE mobile_record_id IS NOT NULL
                    ) ranked WHERE rn > 1
                );", suppressTransaction: true);

            migrationBuilder.Sql(@"
                DELETE FROM ""DevolucionesPedido"" WHERE id IN (
                    SELECT id FROM (
                        SELECT id, ROW_NUMBER() OVER (
                            PARTITION BY tenant_id, mobile_record_id ORDER BY id DESC
                        ) AS rn
                        FROM ""DevolucionesPedido""
                        WHERE mobile_record_id IS NOT NULL
                    ) ranked WHERE rn > 1
                );", suppressTransaction: true);

            migrationBuilder.Sql(@"
                DELETE FROM ""Cobros"" WHERE id IN (
                    SELECT id FROM (
                        SELECT id, ROW_NUMBER() OVER (
                            PARTITION BY tenant_id, mobile_record_id ORDER BY id DESC
                        ) AS rn
                        FROM ""Cobros""
                        WHERE mobile_record_id IS NOT NULL
                    ) ranked WHERE rn > 1
                );", suppressTransaction: true);

            migrationBuilder.Sql(@"
                DELETE FROM ""ClienteVisitas"" WHERE id IN (
                    SELECT id FROM (
                        SELECT id, ROW_NUMBER() OVER (
                            PARTITION BY tenant_id, mobile_record_id ORDER BY id DESC
                        ) AS rn
                        FROM ""ClienteVisitas""
                        WHERE mobile_record_id IS NOT NULL
                    ) ranked WHERE rn > 1
                );", suppressTransaction: true);

            migrationBuilder.Sql(@"
                DELETE FROM ""Clientes"" WHERE id IN (
                    SELECT id FROM (
                        SELECT id, ROW_NUMBER() OVER (
                            PARTITION BY tenant_id, mobile_record_id ORDER BY id DESC
                        ) AS rn
                        FROM ""Clientes""
                        WHERE mobile_record_id IS NOT NULL
                    ) ranked WHERE rn > 1
                );", suppressTransaction: true);

            // Drop indexes previos no-unique (Gastos, Devoluciones).
            // DROP INDEX CONCURRENTLY tampoco corre en transaccion.
            migrationBuilder.Sql("DROP INDEX CONCURRENTLY IF EXISTS \"IX_Gastos_tenant_id_mobile_record_id\";", suppressTransaction: true);
            migrationBuilder.Sql("DROP INDEX CONCURRENTLY IF EXISTS \"IX_DevolucionesPedido_tenant_id_mobile_record_id\";", suppressTransaction: true);

            // CREATE UNIQUE INDEX CONCURRENTLY en 7 entidades.
            // suppressTransaction:true es CRITICAL — CREATE INDEX CONCURRENTLY
            // no puede correr dentro de una transaccion (PG limitation).
            migrationBuilder.Sql(
                "CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS \"IX_Pedidos_tenant_id_mobile_record_id\" " +
                "ON \"Pedidos\" (\"tenant_id\", \"mobile_record_id\") " +
                "WHERE \"mobile_record_id\" IS NOT NULL;",
                suppressTransaction: true);

            migrationBuilder.Sql(
                "CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS \"IX_Gastos_tenant_id_mobile_record_id\" " +
                "ON \"Gastos\" (\"tenant_id\", \"mobile_record_id\") " +
                "WHERE \"mobile_record_id\" IS NOT NULL;",
                suppressTransaction: true);

            migrationBuilder.Sql(
                "CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS \"IX_DevolucionesPedido_tenant_id_mobile_record_id\" " +
                "ON \"DevolucionesPedido\" (\"tenant_id\", \"mobile_record_id\") " +
                "WHERE \"mobile_record_id\" IS NOT NULL;",
                suppressTransaction: true);

            migrationBuilder.Sql(
                "CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS \"IX_DetallePedidos_pedido_id_mobile_record_id\" " +
                "ON \"DetallePedidos\" (\"pedido_id\", \"mobile_record_id\") " +
                "WHERE \"mobile_record_id\" IS NOT NULL;",
                suppressTransaction: true);

            migrationBuilder.Sql(
                "CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS \"IX_Cobros_tenant_id_mobile_record_id\" " +
                "ON \"Cobros\" (\"tenant_id\", \"mobile_record_id\") " +
                "WHERE \"mobile_record_id\" IS NOT NULL;",
                suppressTransaction: true);

            migrationBuilder.Sql(
                "CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS \"IX_ClienteVisitas_tenant_id_mobile_record_id\" " +
                "ON \"ClienteVisitas\" (\"tenant_id\", \"mobile_record_id\") " +
                "WHERE \"mobile_record_id\" IS NOT NULL;",
                suppressTransaction: true);

            migrationBuilder.Sql(
                "CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS \"IX_Clientes_tenant_id_mobile_record_id\" " +
                "ON \"Clientes\" (\"tenant_id\", \"mobile_record_id\") " +
                "WHERE \"mobile_record_id\" IS NOT NULL;",
                suppressTransaction: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // DROP CONCURRENTLY simetrico — sin transaccion.
            migrationBuilder.Sql("DROP INDEX CONCURRENTLY IF EXISTS \"IX_Pedidos_tenant_id_mobile_record_id\";", suppressTransaction: true);
            migrationBuilder.Sql("DROP INDEX CONCURRENTLY IF EXISTS \"IX_Gastos_tenant_id_mobile_record_id\";", suppressTransaction: true);
            migrationBuilder.Sql("DROP INDEX CONCURRENTLY IF EXISTS \"IX_DevolucionesPedido_tenant_id_mobile_record_id\";", suppressTransaction: true);
            migrationBuilder.Sql("DROP INDEX CONCURRENTLY IF EXISTS \"IX_DetallePedidos_pedido_id_mobile_record_id\";", suppressTransaction: true);
            migrationBuilder.Sql("DROP INDEX CONCURRENTLY IF EXISTS \"IX_Cobros_tenant_id_mobile_record_id\";", suppressTransaction: true);
            migrationBuilder.Sql("DROP INDEX CONCURRENTLY IF EXISTS \"IX_ClienteVisitas_tenant_id_mobile_record_id\";", suppressTransaction: true);
            migrationBuilder.Sql("DROP INDEX CONCURRENTLY IF EXISTS \"IX_Clientes_tenant_id_mobile_record_id\";", suppressTransaction: true);

            // Restore los indexes no-unique en Gastos y DevolucionesPedido
            // (estado pre-migration).
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
