using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySales.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSubscriptionPlanCaracteristicas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "caracteristicas",
                table: "subscription_plans",
                type: "json",
                nullable: false,
                defaultValue: "[]")
                .Annotation("MySql:CharSet", "utf8mb4");

            // Seed default features for existing plans
            migrationBuilder.Sql(@"
                UPDATE subscription_plans SET caracteristicas = '[""CRM y clientes"",""Pedidos y ventas"",""Soporte por email""]'
                WHERE codigo = 'FREE';

                UPDATE subscription_plans SET caracteristicas = '[""CRM y clientes"",""Pedidos y ventas"",""Facturación SAT básica"",""Soporte por email"",""Reportes avanzados""]'
                WHERE codigo = 'BASIC';

                UPDATE subscription_plans SET caracteristicas = '[""CRM y clientes"",""Pedidos y ventas"",""Facturación SAT básica"",""Soporte por email"",""Rutas y logística"",""Inventarios en tiempo real"",""Reportes avanzados"",""Listas de precios múltiples"",""Soporte prioritario""]'
                WHERE codigo = 'PRO';
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "caracteristicas",
                table: "subscription_plans");
        }
    }
}
