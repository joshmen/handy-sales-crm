using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRefreshTokenConcurrencyXmin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Audit 2026-05-19: NO-OP migration. EF Core detectó la shadow
            // property `xmin` que agregamos en HandySalesDbContext.OnModelCreating
            // como un cambio de modelo y quiso emitir `AddColumn xmin`, pero
            // en PostgreSQL `xmin` ya existe como columna sistema en TODAS
            // las tablas — no requiere creación. La shadow property solo
            // mapea esa columna existente para que EF Core la use como
            // concurrency token. Marker migration solo para que EF Core
            // registre el cambio de modelo en __EFMigrationsHistory.
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // NO-OP. Ver Up.
        }
    }
}
