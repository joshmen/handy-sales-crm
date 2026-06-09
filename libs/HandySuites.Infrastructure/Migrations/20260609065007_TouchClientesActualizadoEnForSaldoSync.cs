using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <summary>
    /// PR 5b follow-up (2026-06-09): bump <c>Cliente.ActualizadoEn = NOW()</c>
    /// para todos los clientes cuyo saldo se modifico en la migration anterior
    /// (BackfillClienteSaldoFromPedidosCobros). Sin esto, el mobile sync
    /// incremental (<c>actualizado_en &gt; lastSyncTimestamp</c>) NO detecta
    /// los cambios de la backfill porque la UPDATE SQL no toca el timestamp.
    ///
    /// Idempotente y sin riesgo — solo bumpa el timestamp para forzar que
    /// mobile re-pull los clientes con saldo en su proximo /api/mobile/sync/pull.
    /// Despues de eso, los hooks de CobroRepository.CrearAsync se encargan de
    /// mantener el timestamp consistente (EF interceptor en SaveChanges).
    /// </summary>
    public partial class TouchClientesActualizadoEnForSaldoSync : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Bump timestamp para que mobile sync detecte los cambios de la
            // backfill anterior. Filtramos solo clientes con saldo distinto a
            // 0 (los unicos que cambiaron en la backfill) Y eliminado_en
            // IS NULL para no resucitar registros soft-deleted.
            migrationBuilder.Sql(@"
                UPDATE ""Clientes""
                SET actualizado_en = NOW()
                WHERE saldo <> 0
                  AND eliminado_en IS NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No rollback. Bumping timestamp es operacion idempotente sin
            // perdida de informacion semantica.
        }
    }
}
