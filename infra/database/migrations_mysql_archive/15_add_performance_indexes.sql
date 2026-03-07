-- ========================================
-- HandySales - Índices de Performance
-- Script: 15_add_performance_indexes.sql
-- Fecha: 2026-01-30
-- Descripción: Agrega índices compuestos para optimizar queries frecuentes
-- ========================================

USE handy_erp;

-- =====================================================
-- CLIENTES - Índices compuestos
-- =====================================================

-- Índice para búsqueda de clientes activos por tenant
CREATE INDEX idx_clientes_tenant_activo ON Clientes(tenant_id, activo);

-- Índice para búsqueda por nombre (LIKE queries)
CREATE INDEX idx_clientes_tenant_nombre ON Clientes(tenant_id, nombre_empresa(100));

-- Índice para búsqueda por RFC
CREATE INDEX idx_clientes_tenant_rfc ON Clientes(tenant_id, rfc);

-- =====================================================
-- PRODUCTOS - Índices compuestos
-- =====================================================

-- Índice para productos activos por tenant
CREATE INDEX idx_productos_tenant_activo ON Productos(tenant_id, activo);

-- Índice para búsqueda por código de barras
CREATE INDEX idx_productos_tenant_codigo ON Productos(tenant_id, codigo_barra);

-- Índice para búsqueda por nombre
CREATE INDEX idx_productos_tenant_nombre ON Productos(tenant_id, nombre(100));

-- Índice compuesto para filtros de familia y categoría
CREATE INDEX idx_productos_tenant_familia_cat ON Productos(tenant_id, familia_id, categoria_id);

-- =====================================================
-- USUARIOS - Índices compuestos
-- =====================================================

-- Índice para usuarios activos por tenant
CREATE INDEX idx_usuarios_tenant_activo ON Usuarios(tenant_id, activo);

-- Índice para búsqueda por nombre
CREATE INDEX idx_usuarios_tenant_nombre ON Usuarios(tenant_id, nombre(50));

-- =====================================================
-- INVENTARIO - Índices compuestos
-- =====================================================

-- Índice para productos con bajo stock (alertas)
CREATE INDEX idx_inventario_tenant_bajo_stock ON Inventario(tenant_id, cantidad_actual, stock_minimo);

-- =====================================================
-- PEDIDOS - Índices adicionales
-- =====================================================

-- Índice para pedidos por rango de fecha
CREATE INDEX idx_pedidos_tenant_fecha_rango ON Pedidos(tenant_id, fecha_pedido, fecha_entrega_estimada);

-- Índice para totales (reportes)
CREATE INDEX idx_pedidos_tenant_total ON Pedidos(tenant_id, total);

-- =====================================================
-- CLIENTE VISITAS - Índices adicionales
-- =====================================================

-- Índice para visitas por resultado
CREATE INDEX idx_visitas_tenant_resultado ON ClienteVisitas(tenant_id, resultado);

-- Índice para reportes de visitas por fecha
CREATE INDEX idx_visitas_tenant_fecha_rango ON ClienteVisitas(tenant_id, fecha_hora_inicio, fecha_hora_fin);

-- =====================================================
-- PRECIOS POR PRODUCTO - Índices compuestos
-- =====================================================

-- Índice para búsqueda rápida de precios
CREATE INDEX idx_precios_tenant_lista_producto ON PreciosPorProducto(tenant_id, lista_precio_id, producto_id);

-- =====================================================
-- DESCUENTOS - Índices compuestos
-- =====================================================

-- Índice para descuentos activos
CREATE INDEX idx_descuentos_tenant_activo ON DescuentosPorCantidad(tenant_id, activo);

-- =====================================================
-- PROMOCIONES - Índices compuestos
-- =====================================================

-- Índice para promociones activas por fecha
CREATE INDEX idx_promociones_tenant_fechas ON Promociones(tenant_id, fecha_inicio, fecha_fin);
CREATE INDEX idx_promociones_tenant_activo ON Promociones(tenant_id, activo);

-- =====================================================
-- ACTIVITY LOGS - Índices para auditoría
-- =====================================================

-- Índice para búsqueda por entidad
CREATE INDEX idx_activity_tenant_entity ON activity_logs(tenant_id, entity_type, entity_id);

-- Índice para búsqueda por usuario y fecha
CREATE INDEX idx_activity_tenant_user_date ON activity_logs(tenant_id, user_id, created_at);

-- Índice para búsqueda por acción
CREATE INDEX idx_activity_tenant_action ON activity_logs(tenant_id, action);

SELECT 'Índices de performance creados exitosamente' AS resultado;
