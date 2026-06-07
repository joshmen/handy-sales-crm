using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUsuariosEmailUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_email",
                table: "Usuarios",
                column: "email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Usuarios_email",
                table: "Usuarios");
        }
    }
}
