using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddHorarioLaboralToCompanySetting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "dias_laborables",
                table: "company_settings",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "hora_fin_jornada",
                table: "company_settings",
                type: "time without time zone",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "hora_inicio_jornada",
                table: "company_settings",
                type: "time without time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "dias_laborables",
                table: "company_settings");

            migrationBuilder.DropColumn(
                name: "hora_fin_jornada",
                table: "company_settings");

            migrationBuilder.DropColumn(
                name: "hora_inicio_jornada",
                table: "company_settings");
        }
    }
}
