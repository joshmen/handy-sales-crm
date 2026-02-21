using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySales.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSoftDelete : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Crear tablas que estaban en el modelo baseline pero nunca fueron creadas físicamente
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS `datos_facturacion` (
                    `Id` int NOT NULL AUTO_INCREMENT,
                    `RFC` varchar(13) NOT NULL,
                    `RazonSocial` varchar(200) NOT NULL,
                    `NombreComercial` varchar(200) NOT NULL DEFAULT '',
                    `Calle` varchar(200) NOT NULL DEFAULT '',
                    `NumeroExterior` varchar(10) NOT NULL DEFAULT '',
                    `NumeroInterior` varchar(10) NOT NULL DEFAULT '',
                    `Colonia` varchar(100) NOT NULL DEFAULT '',
                    `Municipio` varchar(100) NOT NULL DEFAULT '',
                    `Estado` varchar(100) NOT NULL DEFAULT '',
                    `CodigoPostal` varchar(5) NOT NULL DEFAULT '',
                    `Pais` varchar(50) NOT NULL DEFAULT 'México',
                    `RegimenFiscal` varchar(3) NOT NULL DEFAULT '',
                    `UsoCFDI` varchar(3) NOT NULL DEFAULT 'G03',
                    `CorreoElectronico` varchar(100) NOT NULL DEFAULT '',
                    `Telefono` varchar(20) NOT NULL DEFAULT '',
                    `CertificadoCSD` varchar(500) NOT NULL DEFAULT '',
                    `LlaveCSD` varchar(500) NOT NULL DEFAULT '',
                    `PasswordCSD` varchar(100) NOT NULL DEFAULT '',
                    `LogoFactura` varchar(500) NOT NULL DEFAULT '',
                    `Serie` varchar(10) NOT NULL DEFAULT '',
                    `FolioInicial` int NOT NULL DEFAULT 1,
                    `FolioActual` int NOT NULL DEFAULT 1,
                    `TenantId` int NOT NULL,
                    `FacturacionActiva` tinyint(1) NOT NULL DEFAULT 0,
                    `VersionCFDI` varchar(50) NOT NULL DEFAULT '4.0',
                    `LugarExpedicion` varchar(20) NOT NULL DEFAULT '',
                    `NombrePAC` varchar(100) NOT NULL DEFAULT '',
                    `UsuarioPAC` varchar(100) NOT NULL DEFAULT '',
                    `PasswordPAC` varchar(100) NOT NULL DEFAULT '',
                    `URLPACTimbrado` varchar(500) NOT NULL DEFAULT '',
                    `URLPACCancelacion` varchar(500) NOT NULL DEFAULT '',
                    `TipoComprobantePredeterminado` varchar(1) NOT NULL DEFAULT 'I',
                    `FormaPagoPredeterminada` varchar(2) NOT NULL DEFAULT '01',
                    `MetodoPagoPredeterminado` varchar(3) NOT NULL DEFAULT 'PUE',
                    `MonedaPredeterminada` varchar(3) NOT NULL DEFAULT 'MXN',
                    `activo` tinyint(1) NOT NULL DEFAULT 1,
                    `creado_en` datetime(6) NOT NULL,
                    `actualizado_en` datetime(6) NULL,
                    `creado_por` longtext NULL,
                    `actualizado_por` longtext NULL,
                    `version` bigint NOT NULL DEFAULT 1,
                    PRIMARY KEY (`Id`),
                    CONSTRAINT `FK_datos_facturacion_Tenants_TenantId` FOREIGN KEY (`TenantId`) REFERENCES `Tenants` (`id`) ON DELETE CASCADE
                ) CHARACTER SET utf8mb4;
            ");

            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS `notification_preferences` (
                    `Id` int NOT NULL AUTO_INCREMENT,
                    `UserId` int NOT NULL,
                    `TenantId` int NOT NULL,
                    `EmailNotifications` tinyint(1) NOT NULL DEFAULT 1,
                    `PushNotifications` tinyint(1) NOT NULL DEFAULT 1,
                    `OrderUpdates` tinyint(1) NOT NULL DEFAULT 1,
                    `InventoryAlerts` tinyint(1) NOT NULL DEFAULT 1,
                    `SystemAnnouncements` tinyint(1) NOT NULL DEFAULT 1,
                    `activo` tinyint(1) NOT NULL DEFAULT 1,
                    `creado_en` datetime(6) NOT NULL,
                    `actualizado_en` datetime(6) NULL,
                    `creado_por` longtext NULL,
                    `actualizado_por` longtext NULL,
                    `version` bigint NOT NULL DEFAULT 1,
                    PRIMARY KEY (`Id`),
                    CONSTRAINT `FK_notification_preferences_Tenants_TenantId` FOREIGN KEY (`TenantId`) REFERENCES `Tenants` (`id`) ON DELETE CASCADE,
                    CONSTRAINT `FK_notification_preferences_Usuarios_UserId` FOREIGN KEY (`UserId`) REFERENCES `Usuarios` (`id`) ON DELETE CASCADE,
                    UNIQUE KEY `IX_notification_preferences_TenantId_UserId` (`TenantId`, `UserId`)
                ) CHARACTER SET utf8mb4;
            ");

            // Crear índice si no existe
            migrationBuilder.Sql(@"
                SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'datos_facturacion' AND INDEX_NAME = 'IX_datos_facturacion_TenantId_RFC');
                SET @sql = IF(@exists = 0, 'CREATE UNIQUE INDEX `IX_datos_facturacion_TenantId_RFC` ON `datos_facturacion` (`TenantId`, `RFC`)', 'SELECT 1');
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            ");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "Zonas",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "Zonas",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "Usuarios",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "Usuarios",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "UnidadesMedida",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "UnidadesMedida",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "Tenants",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "Tenants",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "RutasVendedor",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "RutasVendedor",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "RutasDetalle",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "RutasDetalle",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "RutasCarga",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "RutasCarga",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "roles",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "roles",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "Promociones",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "Promociones",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "Productos",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "Productos",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "PreciosPorProducto",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "PreciosPorProducto",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "Pedidos",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "Pedidos",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "NotificationHistory",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "NotificationHistory",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "notification_preferences",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "notification_preferences",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "MovimientosInventario",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "MovimientosInventario",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "ListasPrecios",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "ListasPrecios",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "Inventario",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "Inventario",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "FamiliasProductos",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "FamiliasProductos",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "DeviceSessions",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "DeviceSessions",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "DetallePedidos",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "DetallePedidos",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "DescuentosPorCantidad",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "DescuentosPorCantidad",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "DatosEmpresa",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "DatosEmpresa",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "datos_facturacion",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "datos_facturacion",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "company_settings",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "company_settings",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "Cobros",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "Cobros",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "ClienteVisitas",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "ClienteVisitas",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "Clientes",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "Clientes",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "CategoriasProductos",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "CategoriasProductos",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "CategoriasClientes",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "CategoriasClientes",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "eliminado_en",
                table: "Announcements",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "eliminado_por",
                table: "Announcements",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "Zonas");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "Zonas");

            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "UnidadesMedida");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "UnidadesMedida");

            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "RutasVendedor");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "RutasVendedor");

            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "RutasDetalle");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "RutasDetalle");

            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "RutasCarga");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "RutasCarga");

            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "roles");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "roles");

            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "Promociones");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "Promociones");

            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "Productos");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "Productos");

            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "PreciosPorProducto");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "PreciosPorProducto");

            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "Pedidos");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "Pedidos");

            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "NotificationHistory");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "NotificationHistory");

            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "notification_preferences");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "notification_preferences");

            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "MovimientosInventario");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "MovimientosInventario");

            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "ListasPrecios");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "ListasPrecios");

            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "Inventario");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "Inventario");

            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "FamiliasProductos");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "FamiliasProductos");

            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "DeviceSessions");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "DeviceSessions");

            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "DetallePedidos");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "DetallePedidos");

            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "DescuentosPorCantidad");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "DescuentosPorCantidad");

            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "DatosEmpresa");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "DatosEmpresa");

            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "datos_facturacion");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "datos_facturacion");

            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "company_settings");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "company_settings");

            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "Cobros");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "Cobros");

            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "ClienteVisitas");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "ClienteVisitas");

            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "Clientes");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "Clientes");

            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "CategoriasProductos");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "CategoriasProductos");

            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "CategoriasClientes");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "CategoriasClientes");

            migrationBuilder.DropColumn(
                name: "eliminado_en",
                table: "Announcements");

            migrationBuilder.DropColumn(
                name: "eliminado_por",
                table: "Announcements");
        }
    }
}
