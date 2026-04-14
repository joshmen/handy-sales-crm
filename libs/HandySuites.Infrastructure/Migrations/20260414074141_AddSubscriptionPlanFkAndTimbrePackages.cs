using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSubscriptionPlanFkAndTimbrePackages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "timbre_package_id",
                table: "TimbrePurchases",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "subscription_plan_id",
                table: "Tenants",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "timbre_packages",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    cantidad = table.Column<int>(type: "integer", nullable: false),
                    precio_mxn = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    precio_unitario = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    stripe_price_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    badge = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    orden = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_timbre_packages", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TimbrePurchases_timbre_package_id",
                table: "TimbrePurchases",
                column: "timbre_package_id");

            migrationBuilder.CreateIndex(
                name: "IX_Tenants_subscription_plan_id",
                table: "Tenants",
                column: "subscription_plan_id");

            migrationBuilder.AddForeignKey(
                name: "FK_Tenants_subscription_plans_subscription_plan_id",
                table: "Tenants",
                column: "subscription_plan_id",
                principalTable: "subscription_plans",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_TimbrePurchases_timbre_packages_timbre_package_id",
                table: "TimbrePurchases",
                column: "timbre_package_id",
                principalTable: "timbre_packages",
                principalColumn: "id");

            // Seed timbre packages
            migrationBuilder.Sql(@"
                INSERT INTO timbre_packages (nombre, cantidad, precio_mxn, precio_unitario, stripe_price_id, badge, activo, orden) VALUES
                ('Paquete 25', 25, 50.00, 2.00, 'price_1TM11SQ5uhH4KukOqNIMh1O8', NULL, true, 1),
                ('Paquete 50', 50, 85.00, 1.70, 'price_1TM11SQ5uhH4KukOqKCvt8rZ', 'mostPopular', true, 2),
                ('Paquete 100', 100, 150.00, 1.50, 'price_1TM11TQ5uhH4KukOhM4EF0iK', 'bestValue', true, 3)
                ON CONFLICT DO NOTHING;
            ");

            // Backfill subscription_plan_id from plan_tipo
            migrationBuilder.Sql(@"
                UPDATE ""Tenants"" t
                SET subscription_plan_id = sp.id
                FROM subscription_plans sp
                WHERE (UPPER(COALESCE(t.plan_tipo, '')) = sp.codigo)
                   OR (UPPER(t.plan_tipo) = 'PROFESIONAL' AND sp.codigo = 'PRO')
                   OR (UPPER(t.plan_tipo) = 'BASICO' AND sp.codigo = 'BASIC')
                   OR (UPPER(t.plan_tipo) IN ('TRIAL', '') AND sp.codigo = 'FREE')
                   OR (t.plan_tipo IS NULL AND sp.codigo = 'FREE');
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tenants_subscription_plans_subscription_plan_id",
                table: "Tenants");

            migrationBuilder.DropForeignKey(
                name: "FK_TimbrePurchases_timbre_packages_timbre_package_id",
                table: "TimbrePurchases");

            migrationBuilder.DropTable(
                name: "timbre_packages");

            migrationBuilder.DropIndex(
                name: "IX_TimbrePurchases_timbre_package_id",
                table: "TimbrePurchases");

            migrationBuilder.DropIndex(
                name: "IX_Tenants_subscription_plan_id",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "timbre_package_id",
                table: "TimbrePurchases");

            migrationBuilder.DropColumn(
                name: "subscription_plan_id",
                table: "Tenants");
        }
    }
}
