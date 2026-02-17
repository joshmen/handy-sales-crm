-- =============================================
-- Base de datos para el microservicio de Facturación
-- HandySales Billing Service
-- =============================================

CREATE DATABASE IF NOT EXISTS handy_billing 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE handy_billing;
SET NAMES utf8mb4;

-- =============================================
-- Tabla: configuracion_fiscal
-- =============================================
CREATE TABLE IF NOT EXISTS configuracion_fiscal (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL,
    empresa_id INT NOT NULL,
    regimen_fiscal VARCHAR(100),
    rfc VARCHAR(20),
    razon_social VARCHAR(200),
    direccion_fiscal TEXT,
    codigo_postal VARCHAR(10),
    pais VARCHAR(50) DEFAULT 'México',
    moneda VARCHAR(10) DEFAULT 'MXN',
    serie_factura VARCHAR(10),
    folio_actual INT DEFAULT 1,
    certificado_sat TEXT,
    llave_privada TEXT,
    password_certificado VARCHAR(100),
    logo_url VARCHAR(500),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tenant_empresa (tenant_id, empresa_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Tabla: tipos_comprobante
-- =============================================
CREATE TABLE IF NOT EXISTS tipos_comprobante (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL UNIQUE,
    descripcion VARCHAR(100) NOT NULL,
    activo BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Datos iniciales para tipos de comprobante
INSERT INTO tipos_comprobante (codigo, descripcion) VALUES
('I', 'Ingreso'),
('E', 'Egreso'),
('T', 'Traslado'),
('N', 'Nómina'),
('P', 'Pago');

-- =============================================
-- Tabla: metodos_pago
-- =============================================
CREATE TABLE IF NOT EXISTS metodos_pago (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL UNIQUE,
    descripcion VARCHAR(100) NOT NULL,
    requiere_banco BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Datos iniciales para métodos de pago
INSERT INTO metodos_pago (codigo, descripcion, requiere_banco) VALUES
('PUE', 'Pago en una sola exhibición', FALSE),
('PPD', 'Pago en parcialidades o diferido', FALSE),
('01', 'Efectivo', FALSE),
('02', 'Cheque nominativo', TRUE),
('03', 'Transferencia electrónica de fondos', TRUE),
('04', 'Tarjeta de crédito', TRUE),
('28', 'Tarjeta de débito', TRUE),
('99', 'Por definir', FALSE);

-- =============================================
-- Tabla: formas_pago
-- =============================================
CREATE TABLE IF NOT EXISTS formas_pago (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL UNIQUE,
    descripcion VARCHAR(100) NOT NULL,
    activo BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Datos iniciales para formas de pago
INSERT INTO formas_pago (codigo, descripcion) VALUES
('01', 'Efectivo'),
('02', 'Cheque nominativo'),
('03', 'Transferencia electrónica de fondos'),
('04', 'Tarjeta de crédito'),
('28', 'Tarjeta de débito'),
('99', 'Por definir');

-- =============================================
-- Tabla: usos_cfdi
-- =============================================
CREATE TABLE IF NOT EXISTS usos_cfdi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL UNIQUE,
    descripcion VARCHAR(200) NOT NULL,
    aplica_persona_fisica BOOLEAN DEFAULT TRUE,
    aplica_persona_moral BOOLEAN DEFAULT TRUE,
    activo BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Datos iniciales para usos CFDI
INSERT INTO usos_cfdi (codigo, descripcion, aplica_persona_fisica, aplica_persona_moral) VALUES
('G01', 'Adquisición de mercancías', TRUE, TRUE),
('G02', 'Devoluciones, descuentos o bonificaciones', TRUE, TRUE),
('G03', 'Gastos en general', TRUE, TRUE),
('I01', 'Construcciones', TRUE, TRUE),
('I02', 'Mobiliario y equipo de oficina por inversiones', TRUE, TRUE),
('P01', 'Por definir', TRUE, TRUE),
('S01', 'Sin efectos fiscales', TRUE, TRUE);

-- =============================================
-- Tabla: facturas
-- =============================================
CREATE TABLE IF NOT EXISTS facturas (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL,
    uuid VARCHAR(50) UNIQUE,
    serie VARCHAR(10),
    folio INT NOT NULL,
    fecha_emision DATETIME NOT NULL,
    fecha_timbrado DATETIME,
    tipo_comprobante VARCHAR(10) NOT NULL,
    metodo_pago VARCHAR(10),
    forma_pago VARCHAR(10),
    uso_cfdi VARCHAR(10),
    
    -- Datos del emisor (empresa)
    emisor_rfc VARCHAR(20) NOT NULL,
    emisor_nombre VARCHAR(200) NOT NULL,
    emisor_regimen_fiscal VARCHAR(100),
    
    -- Datos del receptor (cliente)
    receptor_rfc VARCHAR(20) NOT NULL,
    receptor_nombre VARCHAR(200) NOT NULL,
    receptor_uso_cfdi VARCHAR(10),
    receptor_domicilio_fiscal VARCHAR(10),
    receptor_regimen_fiscal VARCHAR(100),
    
    -- Montos
    subtotal DECIMAL(18,2) NOT NULL,
    descuento DECIMAL(18,2) DEFAULT 0,
    total_impuestos_trasladados DECIMAL(18,2) DEFAULT 0,
    total_impuestos_retenidos DECIMAL(18,2) DEFAULT 0,
    total DECIMAL(18,2) NOT NULL,
    moneda VARCHAR(10) DEFAULT 'MXN',
    tipo_cambio DECIMAL(10,4) DEFAULT 1,
    
    -- Datos del timbrado
    sello_cfdi TEXT,
    sello_sat TEXT,
    cadena_original_sat TEXT,
    certificado_sat VARCHAR(50),
    fecha_certificacion DATETIME,
    
    -- Estado y referencias
    estado VARCHAR(50) DEFAULT 'PENDIENTE', -- PENDIENTE, TIMBRADA, CANCELADA, ERROR
    estado_cancelacion VARCHAR(50),
    fecha_cancelacion DATETIME,
    motivo_cancelacion VARCHAR(500),
    folio_sustitucion VARCHAR(50),
    
    -- Referencias al sistema principal
    cliente_id INT,
    vendedor_id INT,
    pedido_id BIGINT,
    
    -- Auditoría
    observaciones TEXT,
    xml_content LONGTEXT,
    pdf_url VARCHAR(500),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_tenant (tenant_id),
    INDEX idx_uuid (uuid),
    INDEX idx_serie_folio (serie, folio),
    INDEX idx_fecha (fecha_emision),
    INDEX idx_receptor (receptor_rfc),
    INDEX idx_estado (estado),
    INDEX idx_cliente (cliente_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Tabla: detalle_facturas
-- =============================================
CREATE TABLE IF NOT EXISTS detalle_facturas (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    factura_id BIGINT NOT NULL,
    numero_linea INT NOT NULL,
    
    -- Producto/Servicio
    clave_prod_serv VARCHAR(20) NOT NULL, -- Catálogo SAT
    no_identificacion VARCHAR(100),
    descripcion TEXT NOT NULL,
    unidad VARCHAR(50),
    clave_unidad VARCHAR(10), -- Catálogo SAT
    cantidad DECIMAL(18,6) NOT NULL,
    valor_unitario DECIMAL(18,6) NOT NULL,
    importe DECIMAL(18,2) NOT NULL,
    descuento DECIMAL(18,2) DEFAULT 0,
    
    -- Impuestos del concepto
    objeto_imp VARCHAR(10) DEFAULT '02', -- 01=No objeto, 02=Sí objeto, 03=Sí objeto y no obligado
    
    -- Referencias
    producto_id INT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE,
    INDEX idx_factura (factura_id),
    INDEX idx_producto (producto_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Tabla: impuestos_factura
-- =============================================
CREATE TABLE IF NOT EXISTS impuestos_factura (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    factura_id BIGINT NOT NULL,
    detalle_factura_id BIGINT,
    tipo VARCHAR(20) NOT NULL, -- TRASLADO, RETENCION
    impuesto VARCHAR(10) NOT NULL, -- 001=ISR, 002=IVA, 003=IEPS
    tipo_factor VARCHAR(20) NOT NULL, -- Tasa, Cuota, Exento
    tasa_o_cuota DECIMAL(10,6),
    base DECIMAL(18,2) NOT NULL,
    importe DECIMAL(18,2),
    
    FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE,
    FOREIGN KEY (detalle_factura_id) REFERENCES detalle_facturas(id) ON DELETE CASCADE,
    INDEX idx_factura (factura_id),
    INDEX idx_detalle (detalle_factura_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Tabla: complementos_pago
-- =============================================
CREATE TABLE IF NOT EXISTS complementos_pago (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    factura_id BIGINT NOT NULL,
    fecha_pago DATETIME NOT NULL,
    forma_pago VARCHAR(10) NOT NULL,
    moneda VARCHAR(10) DEFAULT 'MXN',
    tipo_cambio DECIMAL(10,4) DEFAULT 1,
    monto DECIMAL(18,2) NOT NULL,
    num_operacion VARCHAR(100),
    rfc_emisor_cuenta_ord VARCHAR(20),
    cuenta_ordenante VARCHAR(50),
    rfc_emisor_cuenta_ben VARCHAR(20),
    cuenta_beneficiario VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE,
    INDEX idx_factura (factura_id),
    INDEX idx_fecha (fecha_pago)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Tabla: documentos_relacionados
-- =============================================
CREATE TABLE IF NOT EXISTS documentos_relacionados (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    factura_id BIGINT NOT NULL,
    factura_relacionada_id BIGINT,
    uuid_relacionado VARCHAR(50),
    tipo_relacion VARCHAR(10) NOT NULL, -- 01=Nota de crédito, 02=Nota de débito, etc.
    
    FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE,
    FOREIGN KEY (factura_relacionada_id) REFERENCES facturas(id) ON DELETE SET NULL,
    INDEX idx_factura (factura_id),
    INDEX idx_relacionada (factura_relacionada_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Tabla: numeracion_documentos
-- =============================================
CREATE TABLE IF NOT EXISTS numeracion_documentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL,
    tipo_documento VARCHAR(50) NOT NULL, -- FACTURA, NOTA_CREDITO, NOTA_DEBITO, REMISION
    serie VARCHAR(10),
    folio_inicial INT NOT NULL DEFAULT 1,
    folio_actual INT NOT NULL,
    folio_final INT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_numeracion (tenant_id, tipo_documento, serie),
    INDEX idx_tenant_tipo (tenant_id, tipo_documento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Tabla: auditoria_facturacion
-- =============================================
CREATE TABLE IF NOT EXISTS auditoria_facturacion (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL,
    factura_id BIGINT,
    accion VARCHAR(50) NOT NULL, -- CREAR, TIMBRAR, CANCELAR, ENVIAR, DESCARGAR
    descripcion TEXT,
    datos_anteriores JSON,
    datos_nuevos JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    usuario_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_tenant (tenant_id),
    INDEX idx_factura (factura_id),
    INDEX idx_fecha (created_at),
    INDEX idx_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Vistas útiles
-- =============================================

-- Vista de facturas con totales
CREATE OR REPLACE VIEW v_facturas_resumen AS
SELECT 
    f.id,
    f.tenant_id,
    f.uuid,
    CONCAT(f.serie, '-', LPAD(f.folio, 6, '0')) as folio_completo,
    f.fecha_emision,
    f.tipo_comprobante,
    f.receptor_rfc,
    f.receptor_nombre,
    f.subtotal,
    f.descuento,
    f.total_impuestos_trasladados,
    f.total,
    f.estado,
    f.cliente_id,
    COUNT(df.id) as total_conceptos
FROM facturas f
LEFT JOIN detalle_facturas df ON f.id = df.factura_id
GROUP BY f.id;

-- Vista de ingresos por periodo
CREATE OR REPLACE VIEW v_ingresos_periodo AS
SELECT 
    tenant_id,
    DATE(fecha_emision) as fecha,
    YEAR(fecha_emision) as año,
    MONTH(fecha_emision) as mes,
    COUNT(*) as total_facturas,
    SUM(subtotal) as subtotal,
    SUM(total_impuestos_trasladados) as total_iva,
    SUM(total) as total_facturado
FROM facturas
WHERE estado = 'TIMBRADA'
AND tipo_comprobante = 'I'
GROUP BY tenant_id, DATE(fecha_emision);

-- =============================================
-- Stored Procedures
-- =============================================

DELIMITER //

-- Procedimiento para obtener siguiente folio
CREATE PROCEDURE sp_obtener_siguiente_folio(
    IN p_tenant_id VARCHAR(50),
    IN p_tipo_documento VARCHAR(50),
    IN p_serie VARCHAR(10),
    OUT p_folio INT
)
BEGIN
    DECLARE v_folio_actual INT;
    
    START TRANSACTION;
    
    SELECT folio_actual INTO v_folio_actual
    FROM numeracion_documentos
    WHERE tenant_id = p_tenant_id 
    AND tipo_documento = p_tipo_documento
    AND (serie = p_serie OR (serie IS NULL AND p_serie IS NULL))
    AND activo = TRUE
    FOR UPDATE;
    
    IF v_folio_actual IS NULL THEN
        -- Si no existe, crear registro
        INSERT INTO numeracion_documentos (tenant_id, tipo_documento, serie, folio_inicial, folio_actual)
        VALUES (p_tenant_id, p_tipo_documento, p_serie, 1, 1);
        SET p_folio = 1;
    ELSE
        -- Incrementar folio
        SET p_folio = v_folio_actual + 1;
        
        UPDATE numeracion_documentos
        SET folio_actual = p_folio,
            updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = p_tenant_id 
        AND tipo_documento = p_tipo_documento
        AND (serie = p_serie OR (serie IS NULL AND p_serie IS NULL))
        AND activo = TRUE;
    END IF;
    
    COMMIT;
END //

DELIMITER ;

-- =============================================
-- Índices adicionales para optimización
-- =============================================
CREATE INDEX idx_facturas_fecha_estado ON facturas(fecha_emision, estado);
CREATE INDEX idx_facturas_tenant_fecha ON facturas(tenant_id, fecha_emision);
CREATE INDEX idx_detalle_facturas_producto ON detalle_facturas(producto_id);

-- =============================================
-- Permisos (ajustar según usuario)
-- =============================================
-- GRANT ALL PRIVILEGES ON handy_billing.* TO 'handy_user'@'%';
-- FLUSH PRIVILEGES;