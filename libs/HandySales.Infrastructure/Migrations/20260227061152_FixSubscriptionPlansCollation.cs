using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySales.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixSubscriptionPlansCollation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Fix collation mismatch between subscription_plans (utf8mb4_0900_ai_ci)
            // and Tenants.plan_tipo (utf8mb4_unicode_ci) that causes
            // "Illegal mix of collations" on JOIN/WHERE comparisons
            migrationBuilder.Sql(
                "ALTER TABLE subscription_plans CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
