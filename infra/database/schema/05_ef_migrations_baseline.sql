-- ========================================
-- EF Core Migrations Baseline
-- Marks ALL existing migrations as applied
-- so EF doesn't try to recreate the schema
-- ========================================

USE handy_erp;

CREATE TABLE IF NOT EXISTS `__EFMigrationsHistory` (
    `MigrationId` varchar(150) NOT NULL,
    `ProductVersion` varchar(32) NOT NULL,
    PRIMARY KEY (`MigrationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`) VALUES
('20260220015145_InitialBaseline', '8.0.3'),
('20260220233354_AddEmailVerificationFields', '8.0.3'),
('20260221051223_AddDatosEmpresa', '8.0.3'),
('20260221070752_AddSoftDelete', '8.0.3'),
('20260225060645_AddTipoVentaAndFlexibleCobro', '8.0.3'),
('20260225073357_FixMissingVersionColumns', '8.0.3'),
('20260225220931_AddMissingRolesAuditAndActivityLogs', '8.0.3'),
('20260226203932_AddCrashReports', '8.0.3'),
('20260227020623_AddZonaGeoFields', '8.0.3'),
('20260227061152_FixSubscriptionPlansCollation', '8.0.3'),
('20260227062143_AddSubscriptionPlanCaracteristicas', '8.0.3'),
('20260227182911_AddRolColumnToUsuarios', '8.0.3'),
('20260227183921_AddSupervisorRelationship', '8.0.3'),
('20260228003058_AddNumeroExteriorToCliente', '8.0.3'),
('20260228010314_AddDatosFiscalesCliente', '8.0.3'),
('20260228012228_AddClienteCamposCompletos', '8.0.3'),
('20260301224902_AddAutomationsModule', '8.0.3'),
('20260302002315_FixAutomationTemplatesEncoding', '8.0.3'),
('20260305154735_AddMetaVendedor', '8.0.3'),
('20260305192940_AddAutoRenovarMetaVendedor', '8.0.3');
