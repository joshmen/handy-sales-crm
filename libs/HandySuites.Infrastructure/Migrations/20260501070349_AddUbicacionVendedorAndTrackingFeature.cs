using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUbicacionVendedorAndTrackingFeature : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "incluye_tracking_vendedor",
                table: "subscription_plans",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "UbicacionesVendedor",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    usuario_id = table.Column<int>(type: "integer", nullable: false),
                    latitud = table.Column<decimal>(type: "numeric(9,6)", nullable: false),
                    longitud = table.Column<decimal>(type: "numeric(9,6)", nullable: false),
                    precision_metros = table.Column<decimal>(type: "numeric", nullable: true),
                    tipo = table.Column<int>(type: "integer", nullable: false),
                    capturado_en = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    referencia_id = table.Column<int>(type: "integer", nullable: true),
                    dia_servicio = table.Column<DateOnly>(type: "date", nullable: false),
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
                    table.PrimaryKey("PK_UbicacionesVendedor", x => x.id);
                    table.ForeignKey(
                        name: "FK_UbicacionesVendedor_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UbicacionesVendedor_Usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "Usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UbicacionesVendedor_tenant_dia_usuario",
                table: "UbicacionesVendedor",
                columns: new[] { "tenant_id", "dia_servicio", "usuario_id" });

            migrationBuilder.CreateIndex(
                name: "IX_UbicacionesVendedor_tenant_usuario_capturado",
                table: "UbicacionesVendedor",
                columns: new[] { "tenant_id", "usuario_id", "capturado_en" });

            migrationBuilder.CreateIndex(
                name: "IX_UbicacionesVendedor_usuario_id",
                table: "UbicacionesVendedor",
                column: "usuario_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UbicacionesVendedor");

            migrationBuilder.DropColumn(
                name: "incluye_tracking_vendedor",
                table: "subscription_plans");
        }
    }
}
