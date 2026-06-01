using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddGastosAndDevoluciones : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DevolucionesPedido",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    mobile_record_id = table.Column<string>(type: "text", nullable: true),
                    pedido_id = table.Column<int>(type: "integer", nullable: false),
                    cliente_id = table.Column<int>(type: "integer", nullable: false),
                    usuario_id = table.Column<int>(type: "integer", nullable: false),
                    ruta_id = table.Column<int>(type: "integer", nullable: true),
                    fecha_devolucion = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    motivo = table.Column<int>(type: "integer", nullable: false),
                    notas = table.Column<string>(type: "text", nullable: true),
                    tipo_reembolso = table.Column<int>(type: "integer", nullable: false),
                    monto_total = table.Column<decimal>(type: "numeric(14,2)", precision: 14, scale: 2, nullable: false),
                    foto_evidencia_url = table.Column<string>(type: "text", nullable: true),
                    estado = table.Column<int>(type: "integer", nullable: false),
                    anulada_por = table.Column<string>(type: "text", nullable: true),
                    anulada_en = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
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
                    table.PrimaryKey("PK_DevolucionesPedido", x => x.id);
                    table.ForeignKey(
                        name: "FK_DevolucionesPedido_Clientes_cliente_id",
                        column: x => x.cliente_id,
                        principalTable: "Clientes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DevolucionesPedido_Pedidos_pedido_id",
                        column: x => x.pedido_id,
                        principalTable: "Pedidos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DevolucionesPedido_RutasVendedor_ruta_id",
                        column: x => x.ruta_id,
                        principalTable: "RutasVendedor",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_DevolucionesPedido_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DevolucionesPedido_Usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "Usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Gastos",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    mobile_record_id = table.Column<string>(type: "text", nullable: true),
                    ruta_id = table.Column<int>(type: "integer", nullable: true),
                    usuario_id = table.Column<int>(type: "integer", nullable: false),
                    fecha_gasto = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    monto = table.Column<decimal>(type: "numeric(14,2)", precision: 14, scale: 2, nullable: false),
                    tipo_gasto = table.Column<int>(type: "integer", nullable: false),
                    concepto = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    notas = table.Column<string>(type: "text", nullable: true),
                    comprobante_url = table.Column<string>(type: "text", nullable: true),
                    moneda = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false, defaultValue: "MXN"),
                    estado = table.Column<int>(type: "integer", nullable: false),
                    invalidado_por = table.Column<string>(type: "text", nullable: true),
                    invalidado_en = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    motivo_invalidacion = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_Gastos", x => x.id);
                    table.ForeignKey(
                        name: "FK_Gastos_RutasVendedor_ruta_id",
                        column: x => x.ruta_id,
                        principalTable: "RutasVendedor",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Gastos_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Gastos_Usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "Usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DetalleDevoluciones",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    mobile_record_id = table.Column<string>(type: "text", nullable: true),
                    devolucion_id = table.Column<int>(type: "integer", nullable: false),
                    detalle_pedido_id = table.Column<int>(type: "integer", nullable: true),
                    producto_id = table.Column<int>(type: "integer", nullable: false),
                    cantidad = table.Column<decimal>(type: "numeric(14,4)", precision: 14, scale: 4, nullable: false),
                    precio_unitario = table.Column<decimal>(type: "numeric(14,4)", precision: 14, scale: 4, nullable: false),
                    subtotal = table.Column<decimal>(type: "numeric(14,2)", precision: 14, scale: 2, nullable: false),
                    impuesto = table.Column<decimal>(type: "numeric(14,2)", precision: 14, scale: 2, nullable: false),
                    total = table.Column<decimal>(type: "numeric(14,2)", precision: 14, scale: 2, nullable: false),
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
                    table.PrimaryKey("PK_DetalleDevoluciones", x => x.id);
                    table.ForeignKey(
                        name: "FK_DetalleDevoluciones_DetallePedidos_detalle_pedido_id",
                        column: x => x.detalle_pedido_id,
                        principalTable: "DetallePedidos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_DetalleDevoluciones_DevolucionesPedido_devolucion_id",
                        column: x => x.devolucion_id,
                        principalTable: "DevolucionesPedido",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DetalleDevoluciones_Productos_producto_id",
                        column: x => x.producto_id,
                        principalTable: "Productos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DetalleDevoluciones_detalle_pedido_id",
                table: "DetalleDevoluciones",
                column: "detalle_pedido_id");

            migrationBuilder.CreateIndex(
                name: "IX_DetalleDevoluciones_devolucion_id",
                table: "DetalleDevoluciones",
                column: "devolucion_id");

            migrationBuilder.CreateIndex(
                name: "IX_DetalleDevoluciones_producto_id",
                table: "DetalleDevoluciones",
                column: "producto_id");

            migrationBuilder.CreateIndex(
                name: "IX_DevolucionesPedido_cliente_id",
                table: "DevolucionesPedido",
                column: "cliente_id");

            migrationBuilder.CreateIndex(
                name: "IX_DevolucionesPedido_pedido_id",
                table: "DevolucionesPedido",
                column: "pedido_id");

            migrationBuilder.CreateIndex(
                name: "IX_DevolucionesPedido_ruta_id",
                table: "DevolucionesPedido",
                column: "ruta_id");

            migrationBuilder.CreateIndex(
                name: "IX_DevolucionesPedido_tenant_id_cliente_id_fecha_devolucion",
                table: "DevolucionesPedido",
                columns: new[] { "tenant_id", "cliente_id", "fecha_devolucion" });

            migrationBuilder.CreateIndex(
                name: "IX_DevolucionesPedido_tenant_id_mobile_record_id",
                table: "DevolucionesPedido",
                columns: new[] { "tenant_id", "mobile_record_id" });

            migrationBuilder.CreateIndex(
                name: "IX_DevolucionesPedido_tenant_id_pedido_id",
                table: "DevolucionesPedido",
                columns: new[] { "tenant_id", "pedido_id" });

            migrationBuilder.CreateIndex(
                name: "IX_DevolucionesPedido_tenant_id_ruta_id",
                table: "DevolucionesPedido",
                columns: new[] { "tenant_id", "ruta_id" });

            migrationBuilder.CreateIndex(
                name: "IX_DevolucionesPedido_tenant_id_usuario_id_fecha_devolucion",
                table: "DevolucionesPedido",
                columns: new[] { "tenant_id", "usuario_id", "fecha_devolucion" });

            migrationBuilder.CreateIndex(
                name: "IX_DevolucionesPedido_usuario_id",
                table: "DevolucionesPedido",
                column: "usuario_id");

            migrationBuilder.CreateIndex(
                name: "IX_Gastos_ruta_id",
                table: "Gastos",
                column: "ruta_id");

            migrationBuilder.CreateIndex(
                name: "IX_Gastos_tenant_id_fecha_gasto",
                table: "Gastos",
                columns: new[] { "tenant_id", "fecha_gasto" });

            migrationBuilder.CreateIndex(
                name: "IX_Gastos_tenant_id_mobile_record_id",
                table: "Gastos",
                columns: new[] { "tenant_id", "mobile_record_id" });

            migrationBuilder.CreateIndex(
                name: "IX_Gastos_tenant_id_ruta_id",
                table: "Gastos",
                columns: new[] { "tenant_id", "ruta_id" });

            migrationBuilder.CreateIndex(
                name: "IX_Gastos_tenant_id_usuario_id_fecha_gasto",
                table: "Gastos",
                columns: new[] { "tenant_id", "usuario_id", "fecha_gasto" });

            migrationBuilder.CreateIndex(
                name: "IX_Gastos_usuario_id",
                table: "Gastos",
                column: "usuario_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DetalleDevoluciones");

            migrationBuilder.DropTable(
                name: "Gastos");

            migrationBuilder.DropTable(
                name: "DevolucionesPedido");
        }
    }
}
