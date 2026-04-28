using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRutasZonas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RutasZonas",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ruta_id = table.Column<int>(type: "integer", nullable: false),
                    zona_id = table.Column<int>(type: "integer", nullable: false),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RutasZonas", x => x.id);
                    table.ForeignKey(
                        name: "FK_RutasZonas_RutasVendedor_ruta_id",
                        column: x => x.ruta_id,
                        principalTable: "RutasVendedor",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RutasZonas_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RutasZonas_Zonas_zona_id",
                        column: x => x.zona_id,
                        principalTable: "Zonas",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RutasZonas_ruta_id",
                table: "RutasZonas",
                column: "ruta_id");

            migrationBuilder.CreateIndex(
                name: "IX_RutasZonas_ruta_id_zona_id",
                table: "RutasZonas",
                columns: new[] { "ruta_id", "zona_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RutasZonas_tenant_id_ruta_id",
                table: "RutasZonas",
                columns: new[] { "tenant_id", "ruta_id" });

            migrationBuilder.CreateIndex(
                name: "IX_RutasZonas_zona_id",
                table: "RutasZonas",
                column: "zona_id");

            // Backfill: por cada ruta existente con zona_id NOT NULL, crear una entrada
            // en RutasZonas. Idempotente — ON CONFLICT DO NOTHING evita duplicados si la
            // migration se aplica varias veces (ej: rollback parcial + reaplicar).
            // El campo legacy RutaVendedor.zona_id se mantiene durante la transición
            // para no romper apps mobile viejas. Se depreca en sweep posterior.
            migrationBuilder.Sql(@"
                INSERT INTO ""RutasZonas"" (ruta_id, zona_id, tenant_id, creado_en)
                SELECT id, zona_id, tenant_id, NOW() AT TIME ZONE 'UTC'
                FROM ""RutasVendedor""
                WHERE zona_id IS NOT NULL
                ON CONFLICT (ruta_id, zona_id) DO NOTHING;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RutasZonas");
        }
    }
}
