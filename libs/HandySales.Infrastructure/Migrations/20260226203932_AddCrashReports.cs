using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySales.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCrashReports : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CrashReports",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    tenant_id = table.Column<int>(type: "int", nullable: true),
                    user_id = table.Column<int>(type: "int", nullable: true),
                    device_id = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    device_name = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    app_version = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    os_version = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    error_message = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    stack_trace = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    component_name = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    severity = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    resuelto = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    nota_resolucion = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    resuelto_por = table.Column<int>(type: "int", nullable: true),
                    creado_en = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    ResueltoByUsuarioId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CrashReports", x => x.id);
                    table.ForeignKey(
                        name: "FK_CrashReports_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_CrashReports_Usuarios_ResueltoByUsuarioId",
                        column: x => x.ResueltoByUsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_CrashReports_Usuarios_user_id",
                        column: x => x.user_id,
                        principalTable: "Usuarios",
                        principalColumn: "id");
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_CrashReports_ResueltoByUsuarioId",
                table: "CrashReports",
                column: "ResueltoByUsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_CrashReports_tenant_id",
                table: "CrashReports",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_CrashReports_user_id",
                table: "CrashReports",
                column: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CrashReports");
        }
    }
}
