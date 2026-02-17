-- =====================================================
-- Script: 08_create_roles_table.sql
-- Descripción: Crear tabla de roles para el sistema HandySales
-- Autor: Claude Code
-- Fecha: 2025-09-02
-- =====================================================

USE handy_erp;

-- Crear tabla de roles
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_roles_nombre (nombre),
    INDEX idx_roles_activo (activo)
);

-- Insertar roles por defecto del sistema
INSERT INTO roles (nombre, descripcion) VALUES 
('SUPER_ADMIN', 'Super Administrador con acceso completo al sistema'),
('ADMIN', 'Administrador con acceso completo a su tenant'),
('VENDEDOR', 'Vendedor con acceso limitado a funciones de ventas');

-- Agregar columna role_id a la tabla usuarios (si no existe)
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS role_id INT,
ADD CONSTRAINT fk_usuarios_role_id 
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL;

-- Crear índice para la nueva columna
CREATE INDEX IF NOT EXISTS idx_usuarios_role_id ON usuarios(role_id);

-- Actualizar usuarios existentes con roles por defecto basados en el campo 'rol' actual
UPDATE usuarios u 
JOIN roles r ON (
    (u.rol = 'SuperAdmin' AND r.nombre = 'SUPER_ADMIN') OR
    (u.rol = 'Admin' AND r.nombre = 'ADMIN') OR
    (u.rol = 'Vendedor' AND r.nombre = 'VENDEDOR')
)
SET u.role_id = r.id
WHERE u.role_id IS NULL;

-- Nota: Mantener el campo 'rol' por compatibilidad por ahora
-- En el futuro se puede eliminar una vez que todo esté migrado a usar role_id

SELECT 'Tabla roles creada exitosamente' as mensaje;