using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationHistoryUserTenantIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_NotificationHistory_usuario_id",
                table: "NotificationHistory");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationHistory_UsuarioId_TenantId_EnviadoEn",
                table: "NotificationHistory",
                columns: new[] { "usuario_id", "tenant_id", "enviado_en" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_NotificationHistory_UsuarioId_TenantId_EnviadoEn",
                table: "NotificationHistory");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationHistory_usuario_id",
                table: "NotificationHistory",
                column: "usuario_id");
        }
    }
}
