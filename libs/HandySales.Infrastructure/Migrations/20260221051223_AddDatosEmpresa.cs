using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySales.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDatosEmpresa : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ==========================================
            // PASO 1: Crear tabla DatosEmpresa
            // ==========================================
            migrationBuilder.CreateTable(
                name: "DatosEmpresa",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    tenant_id = table.Column<int>(type: "int", nullable: false),
                    razon_social = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    rfc = table.Column<string>(type: "varchar(13)", maxLength: 13, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    telefono = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    email = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    contacto = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    direccion = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ciudad = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    estado = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    codigo_postal = table.Column<string>(type: "varchar(10)", maxLength: 10, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    sitio_web = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    descripcion = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    activo = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    creado_en = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    creado_por = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    actualizado_por = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DatosEmpresa", x => x.id);
                    table.ForeignKey(
                        name: "FK_DatosEmpresa_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_DatosEmpresa_tenant_id",
                table: "DatosEmpresa",
                column: "tenant_id",
                unique: true);

            // ==========================================
            // PASO 2: Migrar datos existentes
            // ==========================================
            migrationBuilder.Sql(@"
                -- Migrar datos de Tenants -> DatosEmpresa (solo si existen columnas)
                INSERT INTO DatosEmpresa (tenant_id, rfc, contacto, telefono, email, direccion, activo, creado_en, version)
                SELECT id, rfc, contacto, telefono, email, direccion, 1, COALESCE(creado_en, NOW()), 1
                FROM Tenants
                WHERE id NOT IN (SELECT tenant_id FROM DatosEmpresa);

                -- Complementar con datos de company_settings (website, description, address)
                UPDATE DatosEmpresa de
                INNER JOIN company_settings cs ON de.tenant_id = cs.tenant_id
                SET de.sitio_web = cs.website,
                    de.descripcion = cs.description,
                    de.direccion = COALESCE(NULLIF(de.direccion, ''), cs.address);
            ");

            // ==========================================
            // PASO 3: Fix FechaExpiracion para trials sin fecha
            // ==========================================
            migrationBuilder.Sql(@"
                UPDATE Tenants SET
                    plan_tipo = 'Trial',
                    fecha_suscripcion = creado_en,
                    fecha_expiracion = DATE_ADD(creado_en, INTERVAL 14 DAY),
                    subscription_status = 'Trial'
                WHERE fecha_expiracion IS NULL AND (plan_tipo IS NULL OR plan_tipo = '');
            ");

            // ==========================================
            // PASO 4: Eliminar columnas redundantes de Tenants
            // ==========================================
            migrationBuilder.DropColumn(name: "contacto", table: "Tenants");
            migrationBuilder.DropColumn(name: "direccion", table: "Tenants");
            migrationBuilder.DropColumn(name: "email", table: "Tenants");
            migrationBuilder.DropColumn(name: "logo_url", table: "Tenants");
            migrationBuilder.DropColumn(name: "rfc", table: "Tenants");
            migrationBuilder.DropColumn(name: "telefono", table: "Tenants");

            // ==========================================
            // PASO 5: Eliminar columnas redundantes de company_settings
            // ==========================================
            migrationBuilder.DropColumn(name: "address", table: "company_settings");
            migrationBuilder.DropColumn(name: "description", table: "company_settings");
            migrationBuilder.DropColumn(name: "email", table: "company_settings");
            migrationBuilder.DropColumn(name: "phone", table: "company_settings");
            migrationBuilder.DropColumn(name: "website", table: "company_settings");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DatosEmpresa");

            migrationBuilder.AddColumn<string>(
                name: "contacto",
                table: "Tenants",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "direccion",
                table: "Tenants",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "email",
                table: "Tenants",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "logo_url",
                table: "Tenants",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "rfc",
                table: "Tenants",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "telefono",
                table: "Tenants",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "address",
                table: "company_settings",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "description",
                table: "company_settings",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "email",
                table: "company_settings",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "phone",
                table: "company_settings",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "website",
                table: "company_settings",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }
    }
}
