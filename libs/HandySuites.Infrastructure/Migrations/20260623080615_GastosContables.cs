using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class GastosContables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GastosContables",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    fecha = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    categoria = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    descripcion = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    @base = table.Column<decimal>(name: "base", type: "numeric(14,2)", precision: 14, scale: 2, nullable: false),
                    iva = table.Column<decimal>(type: "numeric(14,2)", precision: 14, scale: 2, nullable: false),
                    total = table.Column<decimal>(type: "numeric(14,2)", precision: 14, scale: 2, nullable: false),
                    proveedor_rfc = table.Column<string>(type: "character varying(13)", maxLength: 13, nullable: true),
                    proveedor_nombre = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    usuario_id = table.Column<int>(type: "integer", nullable: false),
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
                    table.PrimaryKey("PK_GastosContables", x => x.id);
                    table.ForeignKey(
                        name: "FK_GastosContables_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GastosContables_tenant_id_categoria",
                table: "GastosContables",
                columns: new[] { "tenant_id", "categoria" });

            migrationBuilder.CreateIndex(
                name: "IX_GastosContables_tenant_id_fecha",
                table: "GastosContables",
                columns: new[] { "tenant_id", "fecha" });

            migrationBuilder.CreateIndex(
                name: "IX_GastosContables_tenant_id_proveedor_rfc",
                table: "GastosContables",
                columns: new[] { "tenant_id", "proveedor_rfc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GastosContables");
        }
    }
}
