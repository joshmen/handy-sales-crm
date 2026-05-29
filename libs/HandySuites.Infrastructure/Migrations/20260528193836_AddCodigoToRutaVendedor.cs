using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCodigoToRutaVendedor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // PASO 1: Agregar columna codigo nullable temporalmente para poder
            // backfillear las rutas existentes antes de crear el unique index.
            migrationBuilder.AddColumn<string>(
                name: "codigo",
                table: "RutasVendedor",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            // PASO 2: Backfill de rutas existentes con codigo unico.
            // Formato:
            //   - Rutas normales: RT-YYYYMMDD-NNNN  (secuencia por tenant + dia)
            //   - Templates:      TPL-NNNN         (secuencia por tenant sin fecha)
            // La particion es distinta entre normales y templates porque el
            // codigo template no incluye fecha y partition con DATE(fecha) generaria
            // duplicados entre templates con misma tenant pero distintas fechas.
            migrationBuilder.Sql(@"
                WITH numbered AS (
                    SELECT
                        id,
                        es_template,
                        tenant_id,
                        TO_CHAR(fecha, 'YYYYMMDD') AS fecha_str,
                        CASE WHEN es_template
                            THEN ROW_NUMBER() OVER (PARTITION BY tenant_id, es_template ORDER BY id)
                            ELSE ROW_NUMBER() OVER (PARTITION BY tenant_id, es_template, DATE(fecha) ORDER BY id)
                        END AS seq
                    FROM ""RutasVendedor""
                )
                UPDATE ""RutasVendedor"" rv
                SET codigo = CASE
                    WHEN n.es_template THEN 'TPL-' || LPAD(n.seq::text, 4, '0')
                    ELSE 'RT-' || n.fecha_str || '-' || LPAD(n.seq::text, 4, '0')
                END
                FROM numbered n
                WHERE rv.id = n.id;
            ");

            // PASO 3: Crear unique index ahora que todas las rutas tienen codigo.
            migrationBuilder.CreateIndex(
                name: "IX_RutasVendedor_tenant_id_codigo",
                table: "RutasVendedor",
                columns: new[] { "tenant_id", "codigo" },
                unique: true);

            // ─── AutomationSchedules (tech-debt: estaba en snapshot pero sin
            //     migration previa). Algunas BDs ya tienen la tabla por creacion
            //     manual; usamos CREATE TABLE IF NOT EXISTS para idempotencia.
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""AutomationSchedules"" (
                    id BIGSERIAL PRIMARY KEY,
                    tenant_id INTEGER NOT NULL,
                    automation_id INTEGER NOT NULL,
                    template_slug VARCHAR(50) NOT NULL,
                    scheduled_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
                    status INTEGER NOT NULL,
                    picked_at TIMESTAMP WITHOUT TIME ZONE,
                    completed_at TIMESTAMP WITHOUT TIME ZONE,
                    error_message VARCHAR(500),
                    attempt INTEGER NOT NULL,
                    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
                    CONSTRAINT ""FK_AutomationSchedules_TenantAutomations_automation_id""
                        FOREIGN KEY (automation_id) REFERENCES ""TenantAutomations""(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS ""IX_AutomationSchedules_automation_id""
                    ON ""AutomationSchedules"" (automation_id);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AutomationSchedules");

            migrationBuilder.DropIndex(
                name: "IX_RutasVendedor_tenant_id_codigo",
                table: "RutasVendedor");

            migrationBuilder.DropColumn(
                name: "codigo",
                table: "RutasVendedor");
        }
    }
}
