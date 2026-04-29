using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTasasImpuestoCatalogo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Default TRUE — los precios viejos en producción se interpretan como
            // "ya incluyen IVA" (lo que el cliente paga). Esto arregla el bug
            // reportado 2026-04-28: tickets cobraban de más al sumar 16% sobre
            // precios que ya eran finales. Quien registró precios como "base sin
            // IVA" debe desmarcar el flag por producto.
            migrationBuilder.AddColumn<bool>(
                name: "precio_incluye_iva",
                table: "Productos",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<int>(
                name: "tasa_impuesto_id",
                table: "Productos",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "TasasImpuesto",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    tasa = table.Column<decimal>(type: "numeric(7,6)", precision: 7, scale: 6, nullable: false),
                    clave_sat = table.Column<string>(type: "text", nullable: false),
                    tipo_impuesto = table.Column<string>(type: "text", nullable: false),
                    es_default = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_TasasImpuesto", x => x.id);
                    table.ForeignKey(
                        name: "FK_TasasImpuesto_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Productos_tasa_impuesto_id",
                table: "Productos",
                column: "tasa_impuesto_id");

            migrationBuilder.CreateIndex(
                name: "IX_TasasImpuesto_tenant_id_es_default",
                table: "TasasImpuesto",
                columns: new[] { "tenant_id", "es_default" });

            migrationBuilder.AddForeignKey(
                name: "FK_Productos_TasasImpuesto_tasa_impuesto_id",
                table: "Productos",
                column: "tasa_impuesto_id",
                principalTable: "TasasImpuesto",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            // Seed: 1 fila "IVA 16%" per tenant marcada EsDefault=true. Tenants
            // creados después del deploy reciben su default vía code (TenantService
            // crea su IVA al crear tenant — TODO follow-up).
            migrationBuilder.Sql(@"
                INSERT INTO ""TasasImpuesto""
                    (tenant_id, nombre, tasa, clave_sat, tipo_impuesto, es_default, activo, creado_en, version)
                SELECT id, 'IVA 16%', 0.16, '002', 'Traslado', true, true, NOW() AT TIME ZONE 'UTC', 1
                FROM ""Tenants""
                WHERE NOT EXISTS (
                    SELECT 1 FROM ""TasasImpuesto"" t WHERE t.tenant_id = ""Tenants"".id
                );
            ");

            // Productos.tasa_impuesto_id queda NULL — el helper CalculateLineAmounts
            // resuelve a la tasa default del tenant en runtime. NO necesitamos
            // backfill obligatorio (más simple, menos riesgo de drift FK).
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Productos_TasasImpuesto_tasa_impuesto_id",
                table: "Productos");

            migrationBuilder.DropTable(
                name: "TasasImpuesto");

            migrationBuilder.DropIndex(
                name: "IX_Productos_tasa_impuesto_id",
                table: "Productos");

            migrationBuilder.DropColumn(
                name: "precio_incluye_iva",
                table: "Productos");

            migrationBuilder.DropColumn(
                name: "tasa_impuesto_id",
                table: "Productos");
        }
    }
}
