-- ========================================
-- EF Core Migrations Baseline
-- Marks the InitialBaseline migration as applied
-- so EF doesn't try to recreate the schema
-- ========================================

USE handy_erp;

CREATE TABLE IF NOT EXISTS `__EFMigrationsHistory` (
    `MigrationId` varchar(150) NOT NULL,
    `ProductVersion` varchar(32) NOT NULL,
    PRIMARY KEY (`MigrationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260220015145_InitialBaseline', '8.0.3');
