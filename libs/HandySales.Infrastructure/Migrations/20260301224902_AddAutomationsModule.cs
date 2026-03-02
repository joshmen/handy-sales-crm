using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySales.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAutomationsModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AutomationTemplates",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    slug = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    nombre = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    descripcion = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    descripcion_corta = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    icono = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    categoria = table.Column<int>(type: "int", nullable: false),
                    trigger_type = table.Column<int>(type: "int", nullable: false),
                    trigger_event = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    trigger_cron = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    action_type = table.Column<int>(type: "int", nullable: false),
                    default_params_json = table.Column<string>(type: "json", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    tier = table.Column<int>(type: "int", nullable: false),
                    orden = table.Column<int>(type: "int", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AutomationTemplates", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "TenantAutomations",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    tenant_id = table.Column<int>(type: "int", nullable: false),
                    template_id = table.Column<int>(type: "int", nullable: false),
                    params_json = table.Column<string>(type: "json", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    activated_by = table.Column<int>(type: "int", nullable: false),
                    last_executed_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    execution_count = table.Column<int>(type: "int", nullable: false),
                    activo = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    creado_en = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    creado_por = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    actualizado_por = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    eliminado_en = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    eliminado_por = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TenantAutomations", x => x.id);
                    table.ForeignKey(
                        name: "FK_TenantAutomations_AutomationTemplates_template_id",
                        column: x => x.template_id,
                        principalTable: "AutomationTemplates",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TenantAutomations_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TenantAutomations_Usuarios_activated_by",
                        column: x => x.activated_by,
                        principalTable: "Usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "AutomationExecutions",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    tenant_id = table.Column<int>(type: "int", nullable: false),
                    automation_id = table.Column<int>(type: "int", nullable: false),
                    template_slug = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    trigger_entity = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    trigger_entity_id = table.Column<int>(type: "int", nullable: true),
                    status = table.Column<int>(type: "int", nullable: false),
                    action_taken = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    resultado_json = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    error_message = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ejecutado_en = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AutomationExecutions", x => x.id);
                    table.ForeignKey(
                        name: "FK_AutomationExecutions_TenantAutomations_automation_id",
                        column: x => x.automation_id,
                        principalTable: "TenantAutomations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_AutomationExecutions_automation_id",
                table: "AutomationExecutions",
                column: "automation_id");

            migrationBuilder.CreateIndex(
                name: "IX_AutomationExecutions_tenant_id_ejecutado_en",
                table: "AutomationExecutions",
                columns: new[] { "tenant_id", "ejecutado_en" });

            migrationBuilder.CreateIndex(
                name: "IX_AutomationExecutions_tenant_id_template_slug",
                table: "AutomationExecutions",
                columns: new[] { "tenant_id", "template_slug" });

            migrationBuilder.CreateIndex(
                name: "IX_AutomationTemplates_slug",
                table: "AutomationTemplates",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TenantAutomations_activated_by",
                table: "TenantAutomations",
                column: "activated_by");

            migrationBuilder.CreateIndex(
                name: "IX_TenantAutomations_template_id",
                table: "TenantAutomations",
                column: "template_id");

            migrationBuilder.CreateIndex(
                name: "IX_TenantAutomations_tenant_id_template_id",
                table: "TenantAutomations",
                columns: new[] { "tenant_id", "template_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AutomationExecutions");

            migrationBuilder.DropTable(
                name: "TenantAutomations");

            migrationBuilder.DropTable(
                name: "AutomationTemplates");
        }
    }
}
