using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueIndexRefreshTokensToken : Migration
    {
        // Sprint correctivo 2026-06-06: CONCURRENTLY. RefreshTokens crece
        // monotonicamente (rotacion ~15min) — en tenants con ~6 meses de
        // operacion la tabla puede tener millones de rows. CREATE INDEX
        // sin CONCURRENTLY bloquearia el login durante minutos.

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS \"IX_RefreshTokens_Token\" " +
                "ON \"RefreshTokens\" (\"Token\");",
                suppressTransaction: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "DROP INDEX CONCURRENTLY IF EXISTS \"IX_RefreshTokens_Token\";",
                suppressTransaction: true);
        }
    }
}
