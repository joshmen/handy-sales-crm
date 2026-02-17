-- =====================================================
-- Script: 07_create_activity_tracking_tables.sql
-- Descripción: Tablas para tracking de actividad y auditoría completa
-- Fecha: 2025-01-02
-- =====================================================

USE handy_erp;

-- =====================================================
-- 1. Tabla principal de actividad/auditoría
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    user_id INT NOT NULL,
    
    -- Información de la actividad
    activity_type VARCHAR(50) NOT NULL, -- 'login', 'logout', 'create', 'update', 'delete', 'view', 'export', 'error'
    activity_category VARCHAR(50) NOT NULL, -- 'auth', 'users', 'products', 'orders', 'clients', 'system'
    activity_status VARCHAR(20) DEFAULT 'success', -- 'success', 'failed', 'warning', 'pending'
    
    -- Detalles de la acción
    entity_type VARCHAR(50), -- 'usuario', 'producto', 'cliente', 'pedido', etc.
    entity_id INT, -- ID de la entidad afectada
    entity_name VARCHAR(255), -- Nombre descriptivo de la entidad
    old_values JSON, -- Valores anteriores (para updates)
    new_values JSON, -- Valores nuevos (para creates/updates)
    
    -- Información de auditoría
    ip_address VARCHAR(45), -- Soporta IPv4 e IPv6
    user_agent TEXT, -- Navegador y sistema operativo
    browser VARCHAR(100), -- Chrome, Firefox, Safari, etc.
    browser_version VARCHAR(20),
    operating_system VARCHAR(100), -- Windows, macOS, Linux, iOS, Android
    device_type VARCHAR(50), -- desktop, mobile, tablet
    
    -- Geolocalización (opcional, se puede llenar con servicio externo)
    country_code VARCHAR(2),
    country_name VARCHAR(100),
    city VARCHAR(100),
    region VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Información adicional
    session_id VARCHAR(255), -- ID de sesión para agrupar actividades
    request_id VARCHAR(255), -- ID único de la petición
    request_method VARCHAR(10), -- GET, POST, PUT, DELETE
    request_url TEXT, -- URL completa de la petición
    response_status INT, -- Código HTTP de respuesta
    response_time_ms INT, -- Tiempo de respuesta en milisegundos
    
    -- Metadata adicional
    description TEXT, -- Descripción legible de la actividad
    error_message TEXT, -- Mensaje de error si aplica
    stack_trace TEXT, -- Stack trace para debugging (solo en desarrollo)
    additional_data JSON, -- Cualquier dato adicional relevante
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices para búsquedas rápidas
    INDEX idx_tenant_user (tenant_id, user_id),
    INDEX idx_activity_type (activity_type),
    INDEX idx_activity_category (activity_category),
    INDEX idx_created_at (created_at),
    INDEX idx_ip_address (ip_address),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_session (session_id),
    
    -- Foreign keys
    FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. Tabla de sesiones de usuario
-- =====================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    tenant_id INT NOT NULL,
    user_id INT NOT NULL,
    
    -- Información de la sesión
    token_hash VARCHAR(255), -- Hash del JWT token
    refresh_token_hash VARCHAR(255), -- Hash del refresh token
    
    -- Información del dispositivo
    ip_address VARCHAR(45),
    user_agent TEXT,
    browser VARCHAR(100),
    operating_system VARCHAR(100),
    device_type VARCHAR(50),
    device_id VARCHAR(255), -- ID único del dispositivo si está disponible
    
    -- Geolocalización
    country_code VARCHAR(2),
    city VARCHAR(100),
    
    -- Estado y tiempos
    is_active BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    logout_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    
    -- Contadores
    requests_count INT DEFAULT 0,
    
    -- Índices
    INDEX idx_session_id (session_id),
    INDEX idx_user_tenant (tenant_id, user_id),
    INDEX idx_active (is_active),
    INDEX idx_last_activity (last_activity),
    
    -- Foreign keys
    FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 3. Tabla de métricas del dashboard por tenant
-- =====================================================
CREATE TABLE IF NOT EXISTS dashboard_metrics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    
    -- Métricas de ventas
    total_sales_today DECIMAL(15,2) DEFAULT 0,
    total_sales_week DECIMAL(15,2) DEFAULT 0,
    total_sales_month DECIMAL(15,2) DEFAULT 0,
    total_sales_year DECIMAL(15,2) DEFAULT 0,
    
    -- Contadores
    orders_today INT DEFAULT 0,
    orders_week INT DEFAULT 0,
    orders_month INT DEFAULT 0,
    
    visits_scheduled_today INT DEFAULT 0,
    visits_completed_today INT DEFAULT 0,
    visits_pending_today INT DEFAULT 0,
    
    active_clients INT DEFAULT 0,
    new_clients_month INT DEFAULT 0,
    
    -- Promedios
    average_order_value DECIMAL(15,2) DEFAULT 0,
    average_daily_sales DECIMAL(15,2) DEFAULT 0,
    
    -- Última actualización
    last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices
    UNIQUE KEY unique_tenant (tenant_id),
    INDEX idx_last_calculated (last_calculated),
    
    -- Foreign key
    FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 4. Tabla de notificaciones/alertas
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    user_id INT, -- NULL para notificaciones globales del tenant
    
    -- Información de la notificación
    type VARCHAR(50) NOT NULL, -- 'info', 'warning', 'error', 'success', 'alert'
    category VARCHAR(50), -- 'system', 'order', 'payment', 'inventory', etc.
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500), -- URL para acción directa
    icon VARCHAR(50), -- Icono a mostrar
    
    -- Estado
    is_read BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    
    -- Metadata
    metadata JSON, -- Datos adicionales específicos del tipo de notificación
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL, -- Cuándo expira la notificación
    
    -- Índices
    INDEX idx_tenant_user (tenant_id, user_id),
    INDEX idx_unread (tenant_id, user_id, is_read),
    INDEX idx_created (created_at),
    INDEX idx_type (type),
    
    -- Foreign keys
    FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 5. Tabla de eventos del sistema (para Super Admin)
-- =====================================================
CREATE TABLE IF NOT EXISTS system_events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Información del evento
    event_type VARCHAR(50) NOT NULL, -- 'tenant_created', 'backup', 'maintenance', 'error', 'security'
    event_severity VARCHAR(20) DEFAULT 'info', -- 'debug', 'info', 'warning', 'error', 'critical'
    event_source VARCHAR(100), -- 'api', 'database', 'scheduler', 'external', etc.
    
    -- Detalles
    tenant_id INT, -- Si aplica a un tenant específico
    affected_tenants INT DEFAULT 0, -- Número de tenants afectados
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    details JSON, -- Detalles técnicos del evento
    
    -- Rendimiento
    execution_time_ms INT, -- Tiempo de ejecución si aplica
    memory_used_mb INT, -- Memoria usada si aplica
    
    -- Resolución
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP NULL,
    resolved_by INT, -- Usuario que resolvió
    resolution_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices
    INDEX idx_event_type (event_type),
    INDEX idx_severity (event_severity),
    INDEX idx_created (created_at),
    INDEX idx_tenant (tenant_id),
    
    -- Foreign keys opcionales
    FOREIGN KEY (tenant_id) REFERENCES Tenants(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES Usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 6. Procedimiento para registrar actividad
-- =====================================================
DELIMITER $$
CREATE PROCEDURE log_activity(
    IN p_tenant_id INT,
    IN p_user_id INT,
    IN p_activity_type VARCHAR(50),
    IN p_activity_category VARCHAR(50),
    IN p_description TEXT,
    IN p_ip_address VARCHAR(45),
    IN p_user_agent TEXT,
    IN p_entity_type VARCHAR(50),
    IN p_entity_id INT,
    IN p_additional_data JSON
)
BEGIN
    INSERT INTO activity_logs (
        tenant_id, user_id, activity_type, activity_category,
        description, ip_address, user_agent, entity_type, 
        entity_id, additional_data
    ) VALUES (
        p_tenant_id, p_user_id, p_activity_type, p_activity_category,
        p_description, p_ip_address, p_user_agent, p_entity_type,
        p_entity_id, p_additional_data
    );
    
    -- Actualizar última actividad en la sesión si existe
    UPDATE user_sessions 
    SET last_activity = CURRENT_TIMESTAMP,
        requests_count = requests_count + 1
    WHERE user_id = p_user_id 
    AND is_active = TRUE
    LIMIT 1;
END$$
DELIMITER ;

-- =====================================================
-- 7. Función para obtener métricas del dashboard
-- =====================================================
DELIMITER $$
CREATE FUNCTION get_dashboard_metrics(p_tenant_id INT)
RETURNS JSON
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE metrics JSON;
    
    SELECT JSON_OBJECT(
        'total_sales_today', COALESCE(total_sales_today, 0),
        'total_sales_month', COALESCE(total_sales_month, 0),
        'orders_today', COALESCE(orders_today, 0),
        'visits_scheduled_today', COALESCE(visits_scheduled_today, 0),
        'active_clients', COALESCE(active_clients, 0),
        'last_updated', last_calculated
    ) INTO metrics
    FROM dashboard_metrics
    WHERE tenant_id = p_tenant_id
    LIMIT 1;
    
    RETURN COALESCE(metrics, JSON_OBJECT('error', 'No metrics found'));
END$$
DELIMITER ;

-- =====================================================
-- 8. Insertar datos de ejemplo para testing
-- =====================================================
-- Insertar métricas iniciales para cada tenant
INSERT INTO dashboard_metrics (tenant_id, total_sales_month, orders_today, active_clients)
SELECT id, 
    ROUND(RAND() * 100000 + 50000, 2),
    FLOOR(RAND() * 20 + 5),
    FLOOR(RAND() * 100 + 50)
FROM Tenants;

-- Insertar algunas actividades de ejemplo
INSERT INTO activity_logs (
    tenant_id, user_id, activity_type, activity_category, 
    description, ip_address, browser, operating_system
) VALUES
(7, 6, 'login', 'auth', 'Administrador Jeyma inició sesión', '192.168.1.100', 'Chrome', 'Windows'),
(7, 8, 'create', 'orders', 'Vendedor creó pedido #1234', '192.168.1.101', 'Firefox', 'Windows'),
(8, 7, 'login', 'auth', 'Administrador Huichol inició sesión', '192.168.1.102', 'Safari', 'macOS'),
(8, 10, 'view', 'clients', 'Vendedor consultó lista de clientes', '192.168.1.103', 'Chrome', 'Android');

-- Mensaje de confirmación
SELECT 'Tablas de tracking y auditoría creadas exitosamente' AS mensaje;