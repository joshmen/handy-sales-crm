using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySales.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEmailVerificationFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "codigo_verificacion",
                table: "Usuarios",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "codigo_verificacion_expiry",
                table: "Usuarios",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "email_verificado",
                table: "Usuarios",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            // Existing users are already verified (they registered before this feature)
            migrationBuilder.Sql("UPDATE Usuarios SET email_verificado = 1 WHERE email_verificado = 0;");

            migrationBuilder.AddColumn<DateTime>(
                name: "password_reset_expiry",
                table: "Usuarios",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "password_reset_token",
                table: "Usuarios",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "cancellation_reason",
                table: "Tenants",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "cancelled_at",
                table: "Tenants",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "grace_period_end",
                table: "Tenants",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "stripe_customer_id",
                table: "Tenants",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "stripe_price_id",
                table: "Tenants",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "stripe_subscription_id",
                table: "Tenants",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "subscription_status",
                table: "Tenants",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "scheduled_actions",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    action_type = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    target_id = table.Column<int>(type: "int", nullable: false),
                    scheduled_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    executed_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    cancelled_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    status = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    notification_sent = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    reason = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    notes = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_by_user_id = table.Column<int>(type: "int", nullable: false),
                    creado_en = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_scheduled_actions", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "subscription_plans",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    nombre = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    codigo = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    precio_mensual = table.Column<decimal>(type: "decimal(65,30)", nullable: false),
                    precio_anual = table.Column<decimal>(type: "decimal(65,30)", nullable: false),
                    max_usuarios = table.Column<int>(type: "int", nullable: false),
                    max_productos = table.Column<int>(type: "int", nullable: false),
                    max_clientes_por_mes = table.Column<int>(type: "int", nullable: false),
                    incluye_reportes = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    incluye_soporte_prioritario = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    stripe_price_id_mensual = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    stripe_price_id_anual = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    activo = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    orden = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_subscription_plans", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "scheduled_actions");

            migrationBuilder.DropTable(
                name: "subscription_plans");

            migrationBuilder.DropColumn(
                name: "codigo_verificacion",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "codigo_verificacion_expiry",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "email_verificado",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "password_reset_expiry",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "password_reset_token",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "cancellation_reason",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "cancelled_at",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "grace_period_end",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "stripe_customer_id",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "stripe_price_id",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "stripe_subscription_id",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "subscription_status",
                table: "Tenants");
        }
    }
}
