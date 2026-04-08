using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAiCreditSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ai_credit_balances",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    anio = table.Column<int>(type: "integer", nullable: false),
                    mes = table.Column<int>(type: "integer", nullable: false),
                    creditos_asignados = table.Column<int>(type: "integer", nullable: false),
                    creditos_usados = table.Column<int>(type: "integer", nullable: false),
                    creditos_extras = table.Column<int>(type: "integer", nullable: false),
                    fecha_reset = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_credit_balances", x => x.id);
                    table.ForeignKey(
                        name: "FK_ai_credit_balances_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ai_credit_purchases",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    creditos = table.Column<int>(type: "integer", nullable: false),
                    precio_mxn = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    stripe_payment_intent_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    estado = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    completado_en = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_credit_purchases", x => x.id);
                    table.ForeignKey(
                        name: "FK_ai_credit_purchases_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ai_usage_logs",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    usuario_id = table.Column<int>(type: "integer", nullable: false),
                    tipo_accion = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    creditos_cobrados = table.Column<int>(type: "integer", nullable: false),
                    prompt = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    modelo_usado = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    tokens_input = table.Column<int>(type: "integer", nullable: false),
                    tokens_output = table.Column<int>(type: "integer", nullable: false),
                    costo_estimado_usd = table.Column<decimal>(type: "numeric(8,4)", nullable: false),
                    latencia_ms = table.Column<int>(type: "integer", nullable: false),
                    exitoso = table.Column<bool>(type: "boolean", nullable: false),
                    error_message = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    creado_en = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_usage_logs", x => x.id);
                    table.ForeignKey(
                        name: "FK_ai_usage_logs_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ai_usage_logs_Usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "Usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ai_credit_balances_tenant_id",
                table: "ai_credit_balances",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_ai_credit_purchases_tenant_id",
                table: "ai_credit_purchases",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_ai_usage_logs_tenant_id",
                table: "ai_usage_logs",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_ai_usage_logs_usuario_id",
                table: "ai_usage_logs",
                column: "usuario_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ai_credit_balances");

            migrationBuilder.DropTable(
                name: "ai_credit_purchases");

            migrationBuilder.DropTable(
                name: "ai_usage_logs");
        }
    }
}
