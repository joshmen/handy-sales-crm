using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTimbresTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "timbres_reset_fecha",
                table: "Tenants",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "timbres_usados_mes",
                table: "Tenants",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "max_timbres_mes",
                table: "subscription_plans",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "timbres_reset_fecha",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "timbres_usados_mes",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "max_timbres_mes",
                table: "subscription_plans");
        }
    }
}
