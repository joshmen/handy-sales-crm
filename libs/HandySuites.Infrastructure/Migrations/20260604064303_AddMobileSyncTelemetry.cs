using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMobileSyncTelemetry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MobileSyncTelemetry",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    usuario_id = table.Column<int>(type: "integer", nullable: false),
                    device_id = table.Column<string>(type: "text", nullable: true),
                    received_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    pending_by_table = table.Column<string>(type: "jsonb", nullable: false),
                    total_pending_count = table.Column<int>(type: "integer", nullable: false),
                    last_sync_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    app_version = table.Column<string>(type: "text", nullable: true),
                    schema_version = table.Column<int>(type: "integer", nullable: true),
                    ip_address = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MobileSyncTelemetry", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_telemetry_received_at",
                table: "MobileSyncTelemetry",
                column: "received_at");

            migrationBuilder.CreateIndex(
                name: "ix_telemetry_tenant_user_received",
                table: "MobileSyncTelemetry",
                columns: new[] { "tenant_id", "usuario_id", "received_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MobileSyncTelemetry");
        }
    }
}
