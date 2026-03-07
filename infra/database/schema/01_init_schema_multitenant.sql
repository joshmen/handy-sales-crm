-- ========================================
-- Script de Creacion de Tablas Handy ERP (Multi-Tenant)
-- Arquitectura: Shared Database, Shared Schema
-- Base de datos: PostgreSQL 16
-- ========================================

CREATE TABLE IF NOT EXISTS "Tenants" (
  id SERIAL PRIMARY KEY,
  nombre_empresa VARCHAR(255) NOT NULL,
  rfc VARCHAR(20),
  contacto VARCHAR(255),
  cloudinary_folder VARCHAR(500) NULL,
  logo_url VARCHAR(500) NULL,
  version BIGINT DEFAULT 1,
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL
);

CREATE TABLE IF NOT EXISTS "Zonas" (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES "Tenants"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "CategoriasClientes" (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES "Tenants"(id) ON DELETE CASCADE
);

-- Usuarios must be created before Clientes (Clientes references vendedor_id -> Usuarios)
CREATE TABLE IF NOT EXISTS "Usuarios" (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nombre VARCHAR(255),
  es_admin BOOLEAN DEFAULT FALSE,
  es_super_admin BOOLEAN DEFAULT FALSE,
  role_id INT NULL,
  avatar_url VARCHAR(500) NULL,
  companyid INT NULL,
  version BIGINT DEFAULT 1,
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES "Tenants"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Clientes" (
  id SERIAL PRIMARY KEY,
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
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES "Tenants"(id) ON DELETE CASCADE,
  FOREIGN KEY (id_zona) REFERENCES "Zonas"(id) ON DELETE SET NULL,
  FOREIGN KEY (categoria_cliente_id) REFERENCES "CategoriasClientes"(id) ON DELETE SET NULL,
  FOREIGN KEY (vendedor_id) REFERENCES "Usuarios"(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "FamiliasProductos" (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES "Tenants"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "CategoriasProductos" (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES "Tenants"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "UnidadesMedida" (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  nombre VARCHAR(50) NOT NULL,
  abreviatura VARCHAR(10),
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES "Tenants"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Productos" (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  codigo_barra VARCHAR(100),
  descripcion TEXT,
  familia_id INT,
  categoria_id INT,
  unidad_medida_id INT,
  precio_base DECIMAL(10,2),
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES "Tenants"(id) ON DELETE CASCADE,
  FOREIGN KEY (familia_id) REFERENCES "FamiliasProductos"(id) ON DELETE SET NULL,
  FOREIGN KEY (categoria_id) REFERENCES "CategoriasProductos"(id) ON DELETE SET NULL,
  FOREIGN KEY (unidad_medida_id) REFERENCES "UnidadesMedida"(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "Inventario" (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad_actual DECIMAL(10,2),
  stock_minimo DECIMAL(10,2),
  stock_maximo DECIMAL(10,2),
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES "Tenants"(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES "Productos"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "ListasPrecios" (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  nombre VARCHAR(100),
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES "Tenants"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "PreciosPorProducto" (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  producto_id INT,
  lista_precio_id INT,
  precio DECIMAL(10,2),
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES "Tenants"(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES "Productos"(id) ON DELETE CASCADE,
  FOREIGN KEY (lista_precio_id) REFERENCES "ListasPrecios"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "DescuentosPorCantidad" (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  producto_id INT,
  cantidad_minima DECIMAL(10,2),
  descuento_porcentaje DECIMAL(5,2),
  tipo_aplicacion VARCHAR(20) DEFAULT 'Producto' CHECK (tipo_aplicacion IN ('Global', 'Producto')),
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES "Tenants"(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES "Productos"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Promociones" (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  nombre VARCHAR(100),
  descripcion TEXT,
  descuento_porcentaje DECIMAL(5,2),
  fecha_inicio DATE,
  fecha_fin DATE,
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES "Tenants"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "PromocionProductos" (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  promocion_id INT NOT NULL,
  producto_id INT NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES "Tenants"(id) ON DELETE CASCADE,
  FOREIGN KEY (promocion_id) REFERENCES "Promociones"(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES "Productos"(id) ON DELETE CASCADE,
  UNIQUE(promocion_id, producto_id)
);

CREATE INDEX idx_promo_prod_promocion ON "PromocionProductos"(promocion_id);
CREATE INDEX idx_promo_prod_producto ON "PromocionProductos"(producto_id);
CREATE INDEX idx_promo_prod_tenant ON "PromocionProductos"(tenant_id);

-- Tabla de RefreshTokens para autenticacion
CREATE TABLE IF NOT EXISTS "RefreshTokens" (
  id SERIAL PRIMARY KEY,
  token VARCHAR(500) NOT NULL,
  userid INT NOT NULL,
  expiresat TIMESTAMP NOT NULL,
  isrevoked BOOLEAN DEFAULT FALSE,
  createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revokedat TIMESTAMP NULL,
  replacedbytoken VARCHAR(500) NULL,
  FOREIGN KEY (userid) REFERENCES "Usuarios"(id) ON DELETE CASCADE
);

-- Tabla de configuracion de empresa por tenant
CREATE TABLE IF NOT EXISTS company_settings (
  id SERIAL PRIMARY KEY,
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
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES "Tenants"(id) ON DELETE CASCADE
);

-- Tabla de configuracion global de la plataforma (SUPER_ADMIN)
CREATE TABLE IF NOT EXISTS "GlobalSettings" (
  id SERIAL PRIMARY KEY,
  platformname VARCHAR(255) NOT NULL DEFAULT 'Handy Suites',
  platformlogo VARCHAR(500) NULL,
  platformlogopublicid VARCHAR(255) NULL,
  platformprimarycolor VARCHAR(7) DEFAULT '#3B82F6',
  platformsecondarycolor VARCHAR(7) DEFAULT '#8B5CF6',
  defaultlanguage VARCHAR(10) DEFAULT 'es',
  defaulttimezone VARCHAR(50) DEFAULT 'America/Mexico_City',
  allowselfregistration BOOLEAN DEFAULT FALSE,
  requireemailverification BOOLEAN DEFAULT TRUE,
  maxuserspercompany INT NULL,
  maxstoragepercompany BIGINT NULL,
  maintenancemode BOOLEAN DEFAULT FALSE,
  maintenancemessage TEXT NULL,
  createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedby VARCHAR(255) NULL
);

-- Insert default global settings
INSERT INTO "GlobalSettings" (platformname, createdat, updatedat)
VALUES ('Handy Suites', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ========================================
-- Tabla de Cobros (Cobranza)
-- ========================================
CREATE TABLE IF NOT EXISTS "Cobros" (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  pedido_id INT NOT NULL,
  cliente_id INT NOT NULL,
  usuario_id INT NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  metodo_pago INT NOT NULL DEFAULT 0,
  fecha_cobro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  referencia VARCHAR(255) NULL,
  notas TEXT NULL,
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  version BIGINT DEFAULT 1,
  FOREIGN KEY (tenant_id) REFERENCES "Tenants"(id) ON DELETE CASCADE,
  FOREIGN KEY (cliente_id) REFERENCES "Clientes"(id) ON DELETE RESTRICT,
  FOREIGN KEY (usuario_id) REFERENCES "Usuarios"(id) ON DELETE RESTRICT
);

CREATE INDEX idx_cobro_tenant_cliente ON "Cobros"(tenant_id, cliente_id);
CREATE INDEX idx_cobro_tenant_usuario ON "Cobros"(tenant_id, usuario_id);
CREATE INDEX idx_cobro_tenant_fecha ON "Cobros"(tenant_id, fecha_cobro);

-- ========================================
-- Tabla de Metas de Vendedor
-- ========================================
CREATE TABLE IF NOT EXISTS "MetasVendedor" (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  usuario_id INT NOT NULL,
  tipo TEXT NOT NULL,
  periodo TEXT NOT NULL,
  monto DECIMAL(18,2) NOT NULL,
  fecha_inicio TIMESTAMP NOT NULL,
  fecha_fin TIMESTAMP NOT NULL,
  auto_renovar BOOLEAN NOT NULL DEFAULT FALSE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP NOT NULL,
  actualizado_en TIMESTAMP NULL,
  creado_por TEXT NULL,
  actualizado_por TEXT NULL,
  eliminado_en TIMESTAMP NULL,
  eliminado_por TEXT NULL,
  version BIGINT NOT NULL DEFAULT 0,
  FOREIGN KEY (tenant_id) REFERENCES "Tenants"(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES "Usuarios"(id) ON DELETE CASCADE
);

CREATE INDEX ix_metasvendedor_tenant_id ON "MetasVendedor"(tenant_id);
CREATE INDEX ix_metasvendedor_usuario_id ON "MetasVendedor"(usuario_id);
