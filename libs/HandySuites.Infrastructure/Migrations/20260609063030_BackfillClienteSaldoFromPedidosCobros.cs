using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <summary>
    /// PR 5b cobros 3 modos (2026-06-09): backfill retroactivo de
    /// <c>Cliente.Saldo</c> calculado desde <c>Pedido.Total</c> menos cobros
    /// activos aplicados al pedido. Solo cuenta pedidos en estados validos
    /// para deuda — Confirmado(2), EnRuta(4), Entregado(5) — y cobros donde
    /// <c>pedido_id IS NOT NULL</c> (los anticipos son creditos, no pagos
    /// contra deuda).
    ///
    /// Reportado en E2E staging 2026-06-09: cliente.saldo estaba 0 para
    /// todos los clientes en staging a pesar de existir pedidos abiertos.
    /// El campo Cliente.Saldo nunca se actualizaba en
    /// CobroService.CrearAsync/AnularAsync. PR 5b agrega los hooks en
    /// CobroRepository + SyncRepository.UpsertCobroAsync; esta migration
    /// hace el backfill one-time para que el filtro mobile saldo &gt; 0 en
    /// modos PorPedido/AbonoFifo del selector funcione contra datos
    /// existentes pre-PR5.
    ///
    /// Idempotente: re-aplicar el UPDATE resulta en el mismo valor (no
    /// requiere WHERE saldo &lt;&gt; calc porque es a UPDATE puro).
    /// Reversible no aplica de forma significativa: el valor previo era
    /// efectivamente 0 o stale; restaurarlo perderia consistencia.
    /// </summary>
    public partial class BackfillClienteSaldoFromPedidosCobros : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Postgres-specific. UPDATE...FROM con subquery agregada en CTE:
            // por cada cliente activo, suma total de pedidos en estados de
            // deuda menos cobros activos aplicados (pedido_id IS NOT NULL,
            // que excluye Anticipos por design).
            //
            // EstadoPedido enum: Confirmado=2, EnRuta=4, Entregado=5.
            // Otros (Borrador=0, Cancelado=6) NO suman a saldo.
            //
            // Clientes sin pedidos en deuda quedan con saldo=0 (subquery
            // retorna 0 via COALESCE).
            //
            // Tablas en PascalCase entrecomilladas; columnas en snake_case.
            migrationBuilder.Sql(@"
                WITH cliente_calc AS (
                    SELECT
                        p.cliente_id,
                        p.tenant_id,
                        SUM(p.total - COALESCE((
                            SELECT SUM(co.monto)
                            FROM ""Cobros"" co
                            WHERE co.pedido_id = p.id
                              AND co.activo = true
                              AND co.eliminado_en IS NULL
                        ), 0)) AS saldo_pendiente
                    FROM ""Pedidos"" p
                    WHERE p.eliminado_en IS NULL
                      AND p.activo = true
                      AND p.estado IN (2, 4, 5) -- Confirmado, EnRuta, Entregado
                    GROUP BY p.cliente_id, p.tenant_id
                )
                UPDATE ""Clientes"" c
                SET saldo = COALESCE(calc.saldo_pendiente, 0)
                FROM cliente_calc calc
                WHERE c.id = calc.cliente_id
                  AND c.tenant_id = calc.tenant_id
                  AND c.eliminado_en IS NULL;
            ");

            // Reset a 0 los clientes que NO aparecen en el CTE (no tienen
            // pedidos en deuda) y que tienen saldo > 0 (stale data).
            migrationBuilder.Sql(@"
                UPDATE ""Clientes"" c
                SET saldo = 0
                WHERE c.eliminado_en IS NULL
                  AND c.saldo <> 0
                  AND NOT EXISTS (
                    SELECT 1 FROM ""Pedidos"" p
                    WHERE p.cliente_id = c.id
                      AND p.tenant_id = c.tenant_id
                      AND p.eliminado_en IS NULL
                      AND p.activo = true
                      AND p.estado IN (2, 4, 5)
                  );
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No rollback significativo: el valor anterior estaba stale (0
            // para todos los clientes en staging). Volver a 0 manualmente si
            // se revierte la migration, mediante:
            //     UPDATE ""Clientes"" SET saldo = 0;
            // pero perderia consistencia con los pedidos abiertos en deuda.
        }
    }
}
