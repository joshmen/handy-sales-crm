using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddOnboardingCompletedToTenant : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "onboarding_completed",
                table: "Tenants",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // Mark all existing tenants as onboarded so they skip the wizard
            migrationBuilder.Sql("UPDATE \"Tenants\" SET onboarding_completed = true");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "onboarding_completed",
                table: "Tenants");
        }
    }
}
