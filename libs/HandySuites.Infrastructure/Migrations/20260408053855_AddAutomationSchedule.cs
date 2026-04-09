using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAutomationSchedule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "activated_by",
                table: "TenantAutomations",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<string>(
                name: "mobile_record_id",
                table: "Pedidos",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "auto_facturar_con_rfc",
                table: "company_settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "mobile_record_id",
                table: "Cobros",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "mobile_record_id",
                table: "ClienteVisitas",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AutomationSchedules",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    automation_id = table.Column<int>(type: "integer", nullable: false),
                    template_slug = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    scheduled_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    picked_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    completed_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    error_message = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    attempt = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AutomationSchedules", x => x.id);
                    table.ForeignKey(
                        name: "FK_AutomationSchedules_TenantAutomations_automation_id",
                        column: x => x.automation_id,
                        principalTable: "TenantAutomations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "idx_schedule_pending",
                table: "AutomationSchedules",
                columns: new[] { "status", "scheduled_at" },
                filter: "status = 0");

            migrationBuilder.CreateIndex(
                name: "idx_schedule_tenant_automation",
                table: "AutomationSchedules",
                columns: new[] { "tenant_id", "automation_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_AutomationSchedules_automation_id",
                table: "AutomationSchedules",
                column: "automation_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AutomationSchedules");

            migrationBuilder.DropColumn(
                name: "mobile_record_id",
                table: "Pedidos");

            migrationBuilder.DropColumn(
                name: "auto_facturar_con_rfc",
                table: "company_settings");

            migrationBuilder.DropColumn(
                name: "mobile_record_id",
                table: "Cobros");

            migrationBuilder.DropColumn(
                name: "mobile_record_id",
                table: "ClienteVisitas");

            migrationBuilder.AlterColumn<int>(
                name: "activated_by",
                table: "TenantAutomations",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);
        }
    }
}
