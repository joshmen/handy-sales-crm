-- ========================================
-- EF Core Migrations Baseline (PostgreSQL)
-- Marks the initial PostgreSQL migration as applied
-- so EF does not try to recreate the schema
-- ========================================

CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" varchar(150) NOT NULL,
    "ProductVersion" varchar(32) NOT NULL,
    PRIMARY KEY ("MigrationId")
);

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion") VALUES
('20260307212716_InitialPostgresBaseline', '8.0.3')
ON CONFLICT ("MigrationId") DO NOTHING;
