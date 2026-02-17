-- ========================================
-- Script de Creacion de Tablas para Sistema de Pedidos
-- Fase 1: Sistema de Pedidos para App Movil
-- Base de datos: MySQL
-- ========================================

USE handy_erp;

-- Tabla principal de Pedidos
CREATE TABLE IF NOT EXISTS Pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  cliente_id INT NOT NULL,
  usuario_id INT NOT NULL,
  numero_pedido VARCHAR(50) NOT NULL,
  fecha_pedido DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_entrega_estimada DATETIME NULL,
  fecha_entrega_real DATETIME NULL,
  estado TINYINT NOT NULL DEFAULT 0 COMMENT '0=Borrador, 1=Enviado, 2=Confirmado, 3=EnProceso, 4=EnRuta, 5=Entregado, 6=Cancelado',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  descuento DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  impuestos DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  notas TEXT NULL,
  direccion_entrega TEXT NULL,
  latitud DOUBLE NULL,
  longitud DOUBLE NULL,
  lista_precio_id INT NULL,
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (cliente_id) REFERENCES Clientes(id) ON DELETE RESTRICT,
  FOREIGN KEY (usuario_id) REFERENCES Usuarios(id) ON DELETE RESTRICT,
  FOREIGN KEY (lista_precio_id) REFERENCES ListasPrecios(id) ON DELETE SET NULL
);

-- Indice unico para numero_pedido por tenant
CREATE UNIQUE INDEX idx_pedidos_numero_tenant ON Pedidos(tenant_id, numero_pedido);

-- Indices para consultas frecuentes
CREATE INDEX idx_pedidos_tenant_estado ON Pedidos(tenant_id, estado);
CREATE INDEX idx_pedidos_tenant_fecha ON Pedidos(tenant_id, fecha_pedido);
CREATE INDEX idx_pedidos_cliente ON Pedidos(cliente_id);
CREATE INDEX idx_pedidos_usuario ON Pedidos(usuario_id);

-- Tabla de Detalles de Pedidos
CREATE TABLE IF NOT EXISTS DetallePedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  precio_unitario DECIMAL(12,2) NOT NULL,
  descuento DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  porcentaje_descuento DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  impuesto DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  notas TEXT NULL,
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL,
  creado_por VARCHAR(255) NULL,
  actualizado_por VARCHAR(255) NULL,
  FOREIGN KEY (pedido_id) REFERENCES Pedidos(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES Productos(id) ON DELETE RESTRICT
);

-- Indices para DetallePedidos
CREATE INDEX idx_detalle_pedidos_pedido ON DetallePedidos(pedido_id);
CREATE INDEX idx_detalle_pedidos_producto ON DetallePedidos(producto_id);

-- ========================================
-- Datos de ejemplo (opcional, comentar en produccion)
-- ========================================

-- Insertar pedido de ejemplo para tenant 1
-- INSERT INTO Pedidos (tenant_id, cliente_id, usuario_id, numero_pedido, estado, subtotal, impuestos, total)
-- SELECT 1, c.id, u.id, 'PED-20250129-0001', 0, 1000.00, 160.00, 1160.00
-- FROM Clientes c, Usuarios u
-- WHERE c.tenant_id = 1 AND u.tenant_id = 1
-- LIMIT 1;
