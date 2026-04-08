using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SimplificarEstadosPedido : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Migrate Enviado(1) → Confirmado(2), EnProceso(3) → Confirmado(2)
            // These states are now obsolete in the simplified 4-state workflow
            migrationBuilder.Sql("""
                UPDATE "Pedidos" SET estado = 2, actualizado_en = NOW()
                WHERE estado IN (1, 3) AND eliminado_en IS NULL;
            """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
