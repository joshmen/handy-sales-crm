using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <summary>
    /// Backfill retroactivo (2026-05-05): copia <c>Cliente.Latitud/Longitud</c>
    /// a <c>Pedido.Latitud/Longitud</c> para pedidos sin coords cuyo cliente
    /// sí tiene ubicación registrada.
    ///
    /// Reportado por owner: en producción, vendedores como Rodrigo tienen
    /// 5 pedidos pero la pantalla GPS Activity solo muestra 3 (filtra
    /// `WHERE Latitud IS NOT NULL`). El histórico estaba sin coords porque
    /// el mobile nunca enviaba lat/long en el sync (modelo WDB no tenía
    /// los campos hasta v20).
    ///
    /// Esta migration es **idempotente** — solo UPDATE WHERE NULL.
    /// Reversible no aplica: los coords backfilled son aproximaciones
    /// válidas (el cliente está en una ubicación conocida; el vendedor
    /// estuvo cerca de él al crear el pedido).
    /// </summary>
    public partial class BackfillPedidoCoordsFromCliente : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Postgres-specific. UPDATE...FROM permite tomar valores de Clientes
            // sin subquery por fila (más rápido en tablas grandes que correlated
            // subquery). El ClienteId tiene índice ya — lookup constante.
            migrationBuilder.Sql(@"
                UPDATE ""Pedidos"" p
                SET ""Latitud"" = c.""Latitud"",
                    ""Longitud"" = c.""Longitud""
                FROM ""Clientes"" c
                WHERE p.""ClienteId"" = c.""Id""
                  AND p.""Latitud"" IS NULL
                  AND c.""Latitud"" IS NOT NULL
                  AND c.""Longitud"" IS NOT NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No rollback. Los coords backfilled son válidos (aprox del cliente).
            // Si en el futuro se necesita revertir, hacerlo manualmente con
            // una migration nueva que UPDATE Pedidos SET Latitud=null WHERE
            // <criterio específico> — no podemos identificar qué pedidos
            // recibieron coords desde este backfill vs desde el flujo normal.
        }
    }
}
