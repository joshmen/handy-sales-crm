using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddVendedorToZonas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Zonas_tenant_id",
                table: "Zonas");

            migrationBuilder.AddColumn<int>(
                name: "vendedor_id",
                table: "Zonas",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Zonas_tenant_id_vendedor_id",
                table: "Zonas",
                columns: new[] { "tenant_id", "vendedor_id" });

            migrationBuilder.CreateIndex(
                name: "IX_Zonas_vendedor_id",
                table: "Zonas",
                column: "vendedor_id");

            migrationBuilder.AddForeignKey(
                name: "FK_Zonas_Usuarios_vendedor_id",
                table: "Zonas",
                column: "vendedor_id",
                principalTable: "Usuarios",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Zonas_Usuarios_vendedor_id",
                table: "Zonas");

            migrationBuilder.DropIndex(
                name: "IX_Zonas_tenant_id_vendedor_id",
                table: "Zonas");

            migrationBuilder.DropIndex(
                name: "IX_Zonas_vendedor_id",
                table: "Zonas");

            migrationBuilder.DropColumn(
                name: "vendedor_id",
                table: "Zonas");

            migrationBuilder.CreateIndex(
                name: "IX_Zonas_tenant_id",
                table: "Zonas",
                column: "tenant_id");
        }
    }
}
