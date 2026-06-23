using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddVehiculos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "vehiculo_id",
                table: "RutasVendedor",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Vehiculos",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    placa = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    tipo = table.Column<int>(type: "integer", nullable: false),
                    capacidad_unidades = table.Column<int>(type: "integer", nullable: false),
                    vendedor_id = table.Column<int>(type: "integer", nullable: true),
                    kilometraje = table.Column<int>(type: "integer", nullable: true),
                    estado = table.Column<int>(type: "integer", nullable: false),
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
                    table.PrimaryKey("PK_Vehiculos", x => x.id);
                    table.ForeignKey(
                        name: "FK_Vehiculos_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Vehiculos_Usuarios_vendedor_id",
                        column: x => x.vendedor_id,
                        principalTable: "Usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RutasVendedor_vehiculo_id",
                table: "RutasVendedor",
                column: "vehiculo_id");

            migrationBuilder.CreateIndex(
                name: "IX_Vehiculos_tenant_id_estado",
                table: "Vehiculos",
                columns: new[] { "tenant_id", "estado" });

            migrationBuilder.CreateIndex(
                name: "IX_Vehiculos_tenant_id_placa",
                table: "Vehiculos",
                columns: new[] { "tenant_id", "placa" },
                unique: true,
                filter: "\"eliminado_en\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Vehiculos_tenant_id_vendedor_id",
                table: "Vehiculos",
                columns: new[] { "tenant_id", "vendedor_id" });

            migrationBuilder.CreateIndex(
                name: "IX_Vehiculos_vendedor_id",
                table: "Vehiculos",
                column: "vendedor_id");

            migrationBuilder.AddForeignKey(
                name: "FK_RutasVendedor_Vehiculos_vehiculo_id",
                table: "RutasVendedor",
                column: "vehiculo_id",
                principalTable: "Vehiculos",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RutasVendedor_Vehiculos_vehiculo_id",
                table: "RutasVendedor");

            migrationBuilder.DropTable(
                name: "Vehiculos");

            migrationBuilder.DropIndex(
                name: "IX_RutasVendedor_vehiculo_id",
                table: "RutasVendedor");

            migrationBuilder.DropColumn(
                name: "vehiculo_id",
                table: "RutasVendedor");
        }
    }
}
