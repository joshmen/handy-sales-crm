using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddForceSingleSessionToSubscriptionPlan : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Fix prod 2026-06-04: UX Netflix-style por default (picker en
            // /(auth)/session-limit). El flag estricto SESSION_BLOCKED queda
            // disponible para plans que opten in vía panel SuperAdmin (default
            // false). El vendedor genuino que cambia de cel puede continuar
            // sin fricción usando el picker.
            migrationBuilder.AddColumn<bool>(
                name: "force_single_session",
                table: "subscription_plans",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // Backfill defensivo: si por alguna razón ya hay filas (testing,
            // restore parcial donde el default no aplica a pre-existentes),
            // garantizar false explícitamente.
            migrationBuilder.Sql(@"UPDATE subscription_plans SET force_single_session = false;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "force_single_session",
                table: "subscription_plans");
        }
    }
}
