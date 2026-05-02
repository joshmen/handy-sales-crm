using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class BackfillAndRequireHorarioLaboral : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Backfill: tenants existentes con null reciben default 08:00–18:00 L–V.
            // Usamos sentencias SQL explícitas en lugar de defaultValue del AlterColumn
            // porque queremos defaults significativos (no 00:00 ni "").
            migrationBuilder.Sql(@"
                UPDATE company_settings
                SET hora_inicio_jornada = TIME '08:00:00'
                WHERE hora_inicio_jornada IS NULL;
            ");

            migrationBuilder.Sql(@"
                UPDATE company_settings
                SET hora_fin_jornada = TIME '18:00:00'
                WHERE hora_fin_jornada IS NULL;
            ");

            migrationBuilder.Sql(@"
                UPDATE company_settings
                SET dias_laborables = '1,2,3,4,5'
                WHERE dias_laborables IS NULL OR dias_laborables = '';
            ");

            // Ahora sí, marcar las columnas como NOT NULL.
            migrationBuilder.AlterColumn<TimeOnly>(
                name: "hora_inicio_jornada",
                table: "company_settings",
                type: "time without time zone",
                nullable: false,
                defaultValue: new TimeOnly(8, 0, 0),
                oldClrType: typeof(TimeOnly),
                oldType: "time without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<TimeOnly>(
                name: "hora_fin_jornada",
                table: "company_settings",
                type: "time without time zone",
                nullable: false,
                defaultValue: new TimeOnly(18, 0, 0),
                oldClrType: typeof(TimeOnly),
                oldType: "time without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "dias_laborables",
                table: "company_settings",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "1,2,3,4,5",
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<TimeOnly>(
                name: "hora_inicio_jornada",
                table: "company_settings",
                type: "time without time zone",
                nullable: true,
                oldClrType: typeof(TimeOnly),
                oldType: "time without time zone");

            migrationBuilder.AlterColumn<TimeOnly>(
                name: "hora_fin_jornada",
                table: "company_settings",
                type: "time without time zone",
                nullable: true,
                oldClrType: typeof(TimeOnly),
                oldType: "time without time zone");

            migrationBuilder.AlterColumn<string>(
                name: "dias_laborables",
                table: "company_settings",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);
        }
    }
}
