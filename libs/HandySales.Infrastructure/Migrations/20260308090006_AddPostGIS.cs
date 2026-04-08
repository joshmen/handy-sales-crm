using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySuites.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPostGIS : Migration
    {
        /// <summary>
        /// Originally added PostGIS extension + Point columns. Replaced by Haversine queries
        /// on existing lat/lng columns (Railway managed PostgreSQL does not support PostGIS).
        /// Migration kept as no-op to preserve migration history chain.
        /// </summary>
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // No-op: PostGIS removed in favor of Haversine on lat/lng columns
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No-op
        }
    }
}
