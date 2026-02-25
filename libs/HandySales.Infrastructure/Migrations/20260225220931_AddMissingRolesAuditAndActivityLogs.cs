using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySales.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMissingRolesAuditAndActivityLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add missing AuditableEntity columns to roles table
            // (SQL seed scripts created roles without these columns)
            migrationBuilder.Sql(@"
                SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'creado_en');
                SET @sql = IF(@col_exists = 0,
                    'ALTER TABLE roles ADD COLUMN creado_en datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)',
                    'SELECT 1');
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
            ");
            migrationBuilder.Sql(@"
                SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'actualizado_en');
                SET @sql = IF(@col_exists = 0,
                    'ALTER TABLE roles ADD COLUMN actualizado_en datetime(6) NULL',
                    'SELECT 1');
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
            ");
            migrationBuilder.Sql(@"
                SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'creado_por');
                SET @sql = IF(@col_exists = 0,
                    'ALTER TABLE roles ADD COLUMN creado_por longtext NULL',
                    'SELECT 1');
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
            ");
            migrationBuilder.Sql(@"
                SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'actualizado_por');
                SET @sql = IF(@col_exists = 0,
                    'ALTER TABLE roles ADD COLUMN actualizado_por longtext NULL',
                    'SELECT 1');
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
            ");
            migrationBuilder.Sql(@"
                SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'version');
                SET @sql = IF(@col_exists = 0,
                    'ALTER TABLE roles ADD COLUMN version bigint NOT NULL DEFAULT 1',
                    'SELECT 1');
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
            ");

            // Create activity_logs table if it doesn't exist
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS activity_logs (
                    id int NOT NULL AUTO_INCREMENT,
                    tenant_id int NOT NULL,
                    user_id int NOT NULL,
                    activity_type varchar(50) NOT NULL,
                    activity_category varchar(50) NOT NULL,
                    activity_status varchar(20) DEFAULT 'success',
                    entity_type varchar(50) NULL,
                    entity_id int NULL,
                    entity_name varchar(255) NULL,
                    old_values json NULL,
                    new_values json NULL,
                    ip_address varchar(45) NULL,
                    user_agent longtext NULL,
                    browser varchar(100) NULL,
                    browser_version varchar(20) NULL,
                    operating_system varchar(100) NULL,
                    device_type varchar(50) NULL,
                    country_code varchar(2) NULL,
                    country_name varchar(100) NULL,
                    city varchar(100) NULL,
                    region varchar(100) NULL,
                    latitude decimal(65,30) NULL,
                    longitude decimal(65,30) NULL,
                    session_id varchar(255) NULL,
                    request_id varchar(255) NULL,
                    request_method varchar(10) NULL,
                    request_url longtext NULL,
                    response_status int NULL,
                    response_time_ms int NULL,
                    description longtext NULL,
                    error_message longtext NULL,
                    stack_trace longtext NULL,
                    additional_data json NULL,
                    created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                    PRIMARY KEY (id),
                    KEY ix_activity_logs_tenant_id (tenant_id),
                    KEY ix_activity_logs_user_id (user_id),
                    CONSTRAINT fk_activity_logs_tenant FOREIGN KEY (tenant_id) REFERENCES Tenants(id),
                    CONSTRAINT fk_activity_logs_user FOREIGN KEY (user_id) REFERENCES Usuarios(id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "activity_logs");

            migrationBuilder.DropColumn(name: "creado_en", table: "roles");
            migrationBuilder.DropColumn(name: "actualizado_en", table: "roles");
            migrationBuilder.DropColumn(name: "creado_por", table: "roles");
            migrationBuilder.DropColumn(name: "actualizado_por", table: "roles");
            migrationBuilder.DropColumn(name: "version", table: "roles");
        }
    }
}
