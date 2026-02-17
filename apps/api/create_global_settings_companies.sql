-- Script to create GlobalSettings and Companies tables for proper multi-tenant architecture
-- Date: 2025-01-09
-- Purpose: Separate global platform settings (SUPER_ADMIN) from company-specific settings (ADMIN)

-- 1. Create GlobalSettings table (only one record, managed by SUPER_ADMIN)
CREATE TABLE IF NOT EXISTS `global_settings` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `PlatformName` varchar(100) NOT NULL DEFAULT 'HandyCRM',
    `PlatformLogo` varchar(500) NULL,
    `PlatformPrimaryColor` varchar(7) NULL DEFAULT '#3B82F6',
    `PlatformSecondaryColor` varchar(7) NULL DEFAULT '#8B5CF6',
    `DefaultLanguage` varchar(10) NOT NULL DEFAULT 'es',
    `DefaultTimezone` varchar(50) NOT NULL DEFAULT 'America/Mexico_City',
    `AllowSelfRegistration` tinyint(1) NOT NULL DEFAULT '0',
    `RequireEmailVerification` tinyint(1) NOT NULL DEFAULT '1',
    `MaxUsersPerCompany` int NULL,
    `MaxStoragePerCompany` bigint NULL,
    `MaintenanceMode` tinyint(1) NOT NULL DEFAULT '0',
    `MaintenanceMessage` text NULL,
    `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `UpdatedBy` varchar(100) NULL,
    PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create Companies table (one per tenant, managed by respective ADMIN)
CREATE TABLE IF NOT EXISTS `companies` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `TenantId` int NOT NULL,
    `CompanyName` varchar(200) NOT NULL,
    `CompanyLogo` varchar(500) NULL,
    `CompanyPrimaryColor` varchar(7) NULL,
    `CompanySecondaryColor` varchar(7) NULL,
    `CompanyDescription` text NULL,
    `ContactEmail` varchar(200) NULL,
    `ContactPhone` varchar(50) NULL,
    `Address` text NULL,
    `City` varchar(100) NULL,
    `State` varchar(100) NULL,
    `Country` varchar(100) NULL DEFAULT 'México',
    `PostalCode` varchar(20) NULL,
    `Timezone` varchar(50) NULL DEFAULT 'America/Mexico_City',
    `Currency` varchar(10) NULL DEFAULT 'MXN',
    `TaxId` varchar(50) NULL,
    `SubscriptionStatus` enum('TRIAL','ACTIVE','SUSPENDED','CANCELLED') NOT NULL DEFAULT 'TRIAL',
    `SubscriptionPlan` varchar(50) NULL DEFAULT 'BASIC',
    `SubscriptionExpiresAt` datetime NULL,
    `TrialEndsAt` datetime NULL,
    `MaxUsers` int NULL,
    `CurrentUsers` int NOT NULL DEFAULT '0',
    `MaxStorage` bigint NULL,
    `CurrentStorage` bigint NOT NULL DEFAULT '0',
    `IsActive` tinyint(1) NOT NULL DEFAULT '1',
    `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `UpdatedBy` varchar(100) NULL,
    PRIMARY KEY (`Id`),
    UNIQUE KEY `IX_companies_TenantId` (`TenantId`),
    INDEX `IX_companies_SubscriptionStatus` (`SubscriptionStatus`),
    INDEX `IX_companies_IsActive` (`IsActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Update company_settings table to reference Companies table
ALTER TABLE `company_settings`
ADD COLUMN `CompanyId` int NULL AFTER `Id`,
ADD CONSTRAINT `FK_company_settings_companies` 
    FOREIGN KEY (`CompanyId`) REFERENCES `companies`(`Id`) ON DELETE CASCADE;

-- 4. Insert default global settings
INSERT INTO `global_settings` (`PlatformName`, `PlatformLogo`, `PlatformPrimaryColor`, `PlatformSecondaryColor`, `UpdatedBy`)
VALUES ('HandyCRM', NULL, '#3B82F6', '#8B5CF6', 'system')
ON DUPLICATE KEY UPDATE `Id` = `Id`;

-- 5. Migrate existing company_settings to companies table (if needed)
-- This assumes each existing TenantId should have a company record
INSERT INTO `companies` (
    `TenantId`, 
    `CompanyName`, 
    `CompanyLogo`, 
    `CompanyPrimaryColor`, 
    `CompanySecondaryColor`,
    `IsActive`,
    `UpdatedBy`
)
SELECT DISTINCT 
    cs.`TenantId`,
    COALESCE(cs.`CompanyName`, 'Empresa'),
    cs.`Logo`,
    cs.`PrimaryColor`,
    cs.`SecondaryColor`,
    1,
    'migration'
FROM `company_settings` cs
WHERE NOT EXISTS (
    SELECT 1 FROM `companies` c WHERE c.`TenantId` = cs.`TenantId`
);

-- 6. Update company_settings to link with companies
UPDATE `company_settings` cs
INNER JOIN `companies` c ON cs.`TenantId` = c.`TenantId`
SET cs.`CompanyId` = c.`Id`
WHERE cs.`CompanyId` IS NULL;

-- 7. Create indexes for better performance
CREATE INDEX `IX_global_settings_UpdatedAt` ON `global_settings` (`UpdatedAt`);
CREATE INDEX `IX_companies_CompanyName` ON `companies` (`CompanyName`);
CREATE INDEX `IX_companies_CreatedAt` ON `companies` (`CreatedAt`);

-- 8. Create view for easy access to company full settings
CREATE OR REPLACE VIEW `vw_company_full_settings` AS
SELECT 
    c.`Id`,
    c.`TenantId`,
    c.`CompanyName`,
    c.`CompanyLogo`,
    COALESCE(c.`CompanyPrimaryColor`, gs.`PlatformPrimaryColor`) AS `PrimaryColor`,
    COALESCE(c.`CompanySecondaryColor`, gs.`PlatformSecondaryColor`) AS `SecondaryColor`,
    gs.`PlatformName`,
    gs.`PlatformLogo`,
    gs.`PlatformPrimaryColor`,
    gs.`PlatformSecondaryColor`,
    c.`ContactEmail`,
    c.`ContactPhone`,
    c.`Address`,
    c.`City`,
    c.`State`,
    c.`Country`,
    c.`PostalCode`,
    c.`Timezone`,
    c.`Currency`,
    c.`SubscriptionStatus`,
    c.`SubscriptionPlan`,
    c.`MaxUsers`,
    c.`CurrentUsers`,
    c.`IsActive`
FROM `companies` c
CROSS JOIN `global_settings` gs;

-- Script completed successfully