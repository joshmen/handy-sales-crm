using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMobileRecordIdToCliente : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Idempotente: la columna puede existir ya en algunos entornos (added out-of-band).
            migrationBuilder.Sql(
                "ALTER TABLE \"Clientes\" ADD COLUMN IF NOT EXISTS mobile_record_id text NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "mobile_record_id",
                table: "Clientes");
        }
    }
}
