using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySales.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixMissingVersionColumns : Migration
    {
        /// <summary>
        /// Fix schema drift: the initial SQL seed didn't include `version` and `notas_internas`
        /// columns that AuditableEntity expects. The baseline EF snapshot includes them, so
        /// EF generates empty migrations. We add them via raw SQL with existence checks.
        /// </summary>
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Helper: add column only if it doesn't already exist
            var tables = new[]
            {
                ("Pedidos", "version", "bigint NOT NULL DEFAULT 1"),
                ("Pedidos", "notas_internas", "text NULL"),
                ("DetallePedidos", "version", "bigint NOT NULL DEFAULT 1"),
                ("ClienteVisitas", "version", "bigint NOT NULL DEFAULT 1"),
                ("PromocionProductos", "version", "bigint NOT NULL DEFAULT 1"),
                ("AnnouncementDismissals", "version", "bigint NOT NULL DEFAULT 1"),
            };

            foreach (var (table, column, definition) in tables)
            {
                migrationBuilder.Sql($@"
                    SET @col_exists = (
                        SELECT COUNT(*) FROM information_schema.COLUMNS
                        WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = '{table}'
                          AND COLUMN_NAME = '{column}'
                    );
                    SET @sql = IF(@col_exists = 0,
                        'ALTER TABLE `{table}` ADD COLUMN `{column}` {definition}',
                        'SELECT 1');
                    PREPARE stmt FROM @sql;
                    EXECUTE stmt;
                    DEALLOCATE PREPARE stmt;
                ");
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Dropping version columns would break AuditableEntity, so Down is intentionally empty.
            // These columns are required by the domain model.
        }
    }
}
