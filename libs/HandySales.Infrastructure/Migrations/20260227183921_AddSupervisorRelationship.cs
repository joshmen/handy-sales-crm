using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySales.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSupervisorRelationship : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "supervisor_id",
                table: "Usuarios",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_supervisor_id",
                table: "Usuarios",
                column: "supervisor_id");

            migrationBuilder.AddForeignKey(
                name: "FK_Usuarios_Usuarios_supervisor_id",
                table: "Usuarios",
                column: "supervisor_id",
                principalTable: "Usuarios",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Usuarios_Usuarios_supervisor_id",
                table: "Usuarios");

            migrationBuilder.DropIndex(
                name: "IX_Usuarios_supervisor_id",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "supervisor_id",
                table: "Usuarios");
        }
    }
}
