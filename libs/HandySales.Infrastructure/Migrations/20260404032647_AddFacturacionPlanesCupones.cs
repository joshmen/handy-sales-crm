using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HandySales.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFacturacionPlanesCupones : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "facturas_generadas_mes",
                table: "Tenants",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "facturas_reset_fecha",
                table: "Tenants",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "costo_extra_factura_bloque",
                table: "subscription_plans",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "incluye_facturacion",
                table: "subscription_plans",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "max_facturas_mes",
                table: "subscription_plans",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "tamano_bloque_facturas",
                table: "subscription_plans",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "Cupones",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    codigo = table.Column<string>(type: "text", nullable: false),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    tipo = table.Column<int>(type: "integer", nullable: false),
                    meses_gratis = table.Column<int>(type: "integer", nullable: true),
                    plan_objetivo = table.Column<string>(type: "text", nullable: true),
                    meses_upgrade = table.Column<int>(type: "integer", nullable: true),
                    descuento_porcentaje = table.Column<decimal>(type: "numeric", nullable: true),
                    max_usos = table.Column<int>(type: "integer", nullable: false),
                    usos_actuales = table.Column<int>(type: "integer", nullable: false),
                    fecha_expiracion = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cupones", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "CuponRedenciones",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    cupon_id = table.Column<int>(type: "integer", nullable: false),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    fecha_redencion = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    beneficio_aplicado = table.Column<string>(type: "text", nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CuponRedenciones", x => x.id);
                    table.ForeignKey(
                        name: "FK_CuponRedenciones_Cupones_cupon_id",
                        column: x => x.cupon_id,
                        principalTable: "Cupones",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CuponRedenciones_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CuponRedenciones_cupon_id",
                table: "CuponRedenciones",
                column: "cupon_id");

            migrationBuilder.CreateIndex(
                name: "IX_CuponRedenciones_tenant_id",
                table: "CuponRedenciones",
                column: "tenant_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CuponRedenciones");

            migrationBuilder.DropTable(
                name: "Cupones");

            migrationBuilder.DropColumn(
                name: "facturas_generadas_mes",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "facturas_reset_fecha",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "costo_extra_factura_bloque",
                table: "subscription_plans");

            migrationBuilder.DropColumn(
                name: "incluye_facturacion",
                table: "subscription_plans");

            migrationBuilder.DropColumn(
                name: "max_facturas_mes",
                table: "subscription_plans");

            migrationBuilder.DropColumn(
                name: "tamano_bloque_facturas",
                table: "subscription_plans");
        }
    }
}
