using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUsuariosEmailUniqueIndex : Migration
    {
        // Sprint correctivo 2026-06-06: CONCURRENTLY. Usuarios crece menos
        // que RefreshTokens pero es hot path del login (cada login query
        // `WHERE Email = X`). Sin CONCURRENTLY, deploy bloquea login.

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS \"IX_Usuarios_email\" " +
                "ON \"Usuarios\" (\"email\");",
                suppressTransaction: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "DROP INDEX CONCURRENTLY IF EXISTS \"IX_Usuarios_email\";",
                suppressTransaction: true);
        }
    }
}
