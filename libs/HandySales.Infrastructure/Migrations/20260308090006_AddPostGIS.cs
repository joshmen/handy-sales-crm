using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;

#nullable disable

namespace HandySales.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPostGIS : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:postgis", ",,");

            migrationBuilder.AddColumn<Point>(
                name: "ubicacion",
                table: "RutasDetalle",
                type: "geometry(Point, 4326)",
                nullable: true);

            migrationBuilder.AddColumn<Point>(
                name: "ubicacion",
                table: "Clientes",
                type: "geometry(Point, 4326)",
                nullable: true);

            migrationBuilder.AddColumn<Point>(
                name: "ubicacion_inicio",
                table: "ClienteVisitas",
                type: "geometry(Point, 4326)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Clientes_ubicacion",
                table: "Clientes",
                column: "ubicacion")
                .Annotation("Npgsql:IndexMethod", "gist");

            // Populate spatial columns from existing lat/lng data
            migrationBuilder.Sql(@"
                UPDATE ""Clientes""
                SET ubicacion = ST_SetSRID(ST_MakePoint(longitud, latitud), 4326)
                WHERE latitud IS NOT NULL AND longitud IS NOT NULL;
            ");

            migrationBuilder.Sql(@"
                UPDATE ""ClienteVisitas""
                SET ubicacion_inicio = ST_SetSRID(ST_MakePoint(longitud_inicio, latitud_inicio), 4326)
                WHERE latitud_inicio IS NOT NULL AND longitud_inicio IS NOT NULL;
            ");

            migrationBuilder.Sql(@"
                UPDATE ""RutasDetalle""
                SET ubicacion = ST_SetSRID(ST_MakePoint(longitud, latitud), 4326)
                WHERE latitud IS NOT NULL AND longitud IS NOT NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Clientes_ubicacion",
                table: "Clientes");

            migrationBuilder.DropColumn(
                name: "ubicacion",
                table: "RutasDetalle");

            migrationBuilder.DropColumn(
                name: "ubicacion",
                table: "Clientes");

            migrationBuilder.DropColumn(
                name: "ubicacion_inicio",
                table: "ClienteVisitas");

            migrationBuilder.AlterDatabase()
                .OldAnnotation("Npgsql:PostgresExtension:postgis", ",,");
        }
    }
}
