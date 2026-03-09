using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using Pgvector;

#nullable disable

namespace HandySales.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPgvectorEmbeddings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:vector", ",,");

            migrationBuilder.CreateTable(
                name: "ai_embeddings",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    source_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    source_id = table.Column<int>(type: "integer", nullable: false),
                    content_text = table.Column<string>(type: "text", nullable: false),
                    embedding = table.Column<Vector>(type: "vector(1536)", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_embeddings", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ai_embeddings_tenant_id_source_type_source_id",
                table: "ai_embeddings",
                columns: new[] { "tenant_id", "source_type", "source_id" },
                unique: true);

            // HNSW index for fast cosine similarity search
            migrationBuilder.Sql(@"
                CREATE INDEX ix_ai_embeddings_embedding
                ON ai_embeddings
                USING hnsw (embedding vector_cosine_ops);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP INDEX IF EXISTS ix_ai_embeddings_embedding;");

            migrationBuilder.DropTable(
                name: "ai_embeddings");

            migrationBuilder.AlterDatabase()
                .OldAnnotation("Npgsql:PostgresExtension:vector", ",,");
        }
    }
}
