using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSessionModelRedesign : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Default = 1 (mantiene compat con regla histórica "1 device por user").
            // Plans específicos pueden tener más (BASIC=2, PRO=5, BUSINESS=10) —
            // ajustables después del deploy por admin desde UI.
            migrationBuilder.AddColumn<int>(
                name: "max_concurrent_sessions",
                table: "subscription_plans",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            // Bump default por código de plan. Si los códigos no matchean, no
            // afecta (rows quedan en 1). Esto da plans "starter" 1 sesión,
            // BUSINESS hasta 10. Admin puede editar después.
            migrationBuilder.Sql(@"
                UPDATE subscription_plans SET max_concurrent_sessions = 2 WHERE codigo IN ('BASIC', 'STARTER');
                UPDATE subscription_plans SET max_concurrent_sessions = 5 WHERE codigo IN ('PRO', 'PROFESSIONAL');
                UPDATE subscription_plans SET max_concurrent_sessions = 10 WHERE codigo IN ('BUSINESS', 'ENTERPRISE');
            ");

            // FK 1:1 RefreshToken -> DeviceSession (nullable durante migration window).
            // Después de backfill será NOT NULL en Phase 3 del rediseño.
            migrationBuilder.AddColumn<int>(
                name: "DeviceSessionId",
                table: "RefreshTokens",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_DeviceSessionId",
                table: "RefreshTokens",
                column: "DeviceSessionId");

            migrationBuilder.AddForeignKey(
                name: "FK_RefreshTokens_DeviceSessions_DeviceSessionId",
                table: "RefreshTokens",
                column: "DeviceSessionId",
                principalTable: "DeviceSessions",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RefreshTokens_DeviceSessions_DeviceSessionId",
                table: "RefreshTokens");

            migrationBuilder.DropIndex(
                name: "IX_RefreshTokens_DeviceSessionId",
                table: "RefreshTokens");

            migrationBuilder.DropColumn(
                name: "max_concurrent_sessions",
                table: "subscription_plans");

            migrationBuilder.DropColumn(
                name: "DeviceSessionId",
                table: "RefreshTokens");
        }
    }
}
