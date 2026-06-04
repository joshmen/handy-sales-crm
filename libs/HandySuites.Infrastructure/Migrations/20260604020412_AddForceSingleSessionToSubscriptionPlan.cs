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
            // Fix prod 2026-06-03: política estricta de sesión única.
            // Default true para que los plans existentes la heredan automáticamente
            // y el incidente Rodrigo (admin se logueó como vendedor en otro device)
            // no se repita. Los plans nuevos también arrancan en true.
            migrationBuilder.AddColumn<bool>(
                name: "force_single_session",
                table: "subscription_plans",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            // Backfill defensivo: si por alguna razón ya hay filas (testing,
            // restore parcial), garantizar que todas queden en true. El default
            // solo aplica a inserts posteriores; UPDATE explícito cubre filas
            // pre-existentes.
            migrationBuilder.Sql(@"UPDATE subscription_plans SET force_single_session = true;");
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
