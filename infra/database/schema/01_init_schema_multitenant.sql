
-- ========================================
-- Script de Creación de Tablas Handy ERP (Multi-Tenant)
-- Arquitectura: Shared Database, Shared Schema
-- Base de datos: MySQL
-- ========================================

CREATE DATABASE IF NOT EXISTS handy_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE handy_erp;
SET NAMES utf8mb4;

CREATE TABLE Tenants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_empresa VARCHAR(255) NOT NULL,
  rfc VARCHAR(20),
  contacto VARCHAR(255),
  cloudinary_folder VARCHAR(500) NULL,
  logo_url VARCHAR(500) NULL,
  version BIGINT DEFAULT 1,
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL
);

CREATE TABLE Zonas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE
);

CREATE TABLE CategoriasClientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE
);

CREATE TABLE Clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  rfc VARCHAR(13),
  correo VARCHAR(255),
  telefono VARCHAR(20),
  direccion TEXT,
  id_zona INT,
  categoria_cliente_id INT,
  vendedor_id INT NULL,
  latitud DECIMAL(10,8) NULL,
  longitud DECIMAL(11,8) NULL,
  version BIGINT DEFAULT 1,
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (id_zona) REFERENCES Zonas(id) ON DELETE SET NULL,
  FOREIGN KEY (categoria_cliente_id) REFERENCES CategoriasClientes(id) ON DELETE SET NULL,
  FOREIGN KEY (vendedor_id) REFERENCES Usuarios(id) ON DELETE SET NULL
);

CREATE TABLE FamiliasProductos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE
);

CREATE TABLE CategoriasProductos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE
);

CREATE TABLE UnidadesMedida (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  nombre VARCHAR(50) NOT NULL,
  abreviatura VARCHAR(10),
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE
);

CREATE TABLE Productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  codigo_barra VARCHAR(100),
  descripcion TEXT,
  familia_id INT,
  categoria_id INT,
  unidad_medida_id INT,
  precio_base DECIMAL(10,2),
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (familia_id) REFERENCES FamiliasProductos(id) ON DELETE SET NULL,
  FOREIGN KEY (categoria_id) REFERENCES CategoriasProductos(id) ON DELETE SET NULL,
  FOREIGN KEY (unidad_medida_id) REFERENCES UnidadesMedida(id) ON DELETE SET NULL
);

CREATE TABLE Inventario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad_actual DECIMAL(10,2),
  stock_minimo DECIMAL(10,2),
  stock_maximo DECIMAL(10,2),
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES Productos(id) ON DELETE CASCADE
);

CREATE TABLE ListasPrecios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  nombre VARCHAR(100),
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE
);

CREATE TABLE PreciosPorProducto (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  producto_id INT,
  lista_precio_id INT,
  precio DECIMAL(10,2),
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES Productos(id) ON DELETE CASCADE,
  FOREIGN KEY (lista_precio_id) REFERENCES ListasPrecios(id) ON DELETE CASCADE
);

CREATE TABLE DescuentosPorCantidad (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  producto_id INT,
  cantidad_minima DECIMAL(10,2),
  descuento_porcentaje DECIMAL(5,2),
  tipo_aplicacion ENUM('Global', 'Producto') DEFAULT 'Producto',
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES Productos(id) ON DELETE CASCADE
);

CREATE TABLE Promociones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  nombre VARCHAR(100),
  descripcion TEXT,
  descuento_porcentaje DECIMAL(5,2),
  fecha_inicio DATE,
  fecha_fin DATE,
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE
);

CREATE TABLE PromocionProductos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  promocion_id INT NOT NULL,
  producto_id INT NOT NULL,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (promocion_id) REFERENCES Promociones(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES Productos(id) ON DELETE CASCADE,
  UNIQUE(promocion_id, producto_id)
);

CREATE INDEX idx_promo_prod_promocion ON PromocionProductos(promocion_id);
CREATE INDEX idx_promo_prod_producto ON PromocionProductos(producto_id);
CREATE INDEX idx_promo_prod_tenant ON PromocionProductos(tenant_id);

CREATE TABLE Usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nombre VARCHAR(255),
  es_admin BOOLEAN DEFAULT FALSE,
  es_super_admin BOOLEAN DEFAULT FALSE,
  role_id INT NULL,
  avatar_url VARCHAR(500) NULL,
  CompanyId INT NULL,
  version BIGINT DEFAULT 1,
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE
);

-- Tabla de RefreshTokens para autenticación
CREATE TABLE RefreshTokens (
  Id INT AUTO_INCREMENT PRIMARY KEY,
  Token VARCHAR(500) NOT NULL,
  UserId INT NOT NULL,
  ExpiresAt DATETIME NOT NULL,
  IsRevoked BOOLEAN DEFAULT FALSE,
  CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  RevokedAt DATETIME NULL,
  ReplacedByToken VARCHAR(500) NULL,
  FOREIGN KEY (UserId) REFERENCES Usuarios(id) ON DELETE CASCADE
);

-- Tabla de configuración de empresa por tenant
CREATE TABLE company_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  company_id INT NULL,
  company_name VARCHAR(255) NOT NULL,
  logo_url VARCHAR(500) NULL,
  logo_public_id VARCHAR(255) NULL,
  cloudinary_folder VARCHAR(255) NULL,
  primary_color VARCHAR(7) DEFAULT '#3B82F6',
  secondary_color VARCHAR(7) DEFAULT '#8B5CF6',
  address VARCHAR(500) NULL,
  phone VARCHAR(20) NULL,
  email VARCHAR(255) NULL,
  website VARCHAR(255) NULL,
  description TEXT NULL,
  version BIGINT DEFAULT 1,
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE
);

-- Tabla de configuración global de la plataforma (SUPER_ADMIN)
CREATE TABLE GlobalSettings (
  Id INT AUTO_INCREMENT PRIMARY KEY,
  PlatformName VARCHAR(255) NOT NULL DEFAULT 'Handy Suites',
  PlatformLogo VARCHAR(500) NULL,
  PlatformLogoPublicId VARCHAR(255) NULL,
  PlatformPrimaryColor VARCHAR(7) DEFAULT '#3B82F6',
  PlatformSecondaryColor VARCHAR(7) DEFAULT '#8B5CF6',
  DefaultLanguage VARCHAR(10) DEFAULT 'es',
  DefaultTimezone VARCHAR(50) DEFAULT 'America/Mexico_City',
  AllowSelfRegistration BOOLEAN DEFAULT FALSE,
  RequireEmailVerification BOOLEAN DEFAULT TRUE,
  MaxUsersPerCompany INT NULL,
  MaxStoragePerCompany BIGINT NULL,
  MaintenanceMode BOOLEAN DEFAULT FALSE,
  MaintenanceMessage TEXT NULL,
  CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UpdatedBy VARCHAR(255) NULL
);

-- Insert default global settings
INSERT INTO GlobalSettings (PlatformName, CreatedAt, UpdatedAt)
VALUES ('Handy Suites', NOW(), NOW());

-- ========================================
-- Tabla de Cobros (Cobranza)
-- ========================================
CREATE TABLE IF NOT EXISTS Cobros (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  pedido_id INT NOT NULL,
  cliente_id INT NOT NULL,
  usuario_id INT NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  metodo_pago INT NOT NULL DEFAULT 0,
  fecha_cobro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  referencia VARCHAR(255) NULL,
  notas TEXT NULL,
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  version BIGINT DEFAULT 1,
  FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (pedido_id) REFERENCES Pedidos(id) ON DELETE RESTRICT,
  FOREIGN KEY (cliente_id) REFERENCES Clientes(id) ON DELETE RESTRICT,
  FOREIGN KEY (usuario_id) REFERENCES Usuarios(id) ON DELETE RESTRICT
);

CREATE INDEX idx_cobro_tenant_cliente ON Cobros(tenant_id, cliente_id);
CREATE INDEX idx_cobro_tenant_pedido ON Cobros(tenant_id, pedido_id);
CREATE INDEX idx_cobro_tenant_usuario ON Cobros(tenant_id, usuario_id);
CREATE INDEX idx_cobro_tenant_fecha ON Cobros(tenant_id, fecha_cobro);
