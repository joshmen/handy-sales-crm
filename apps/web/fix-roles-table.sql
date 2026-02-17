-- Script para crear o actualizar la tabla roles
-- Ejecuta este script en tu base de datos MySQL

-- Primero, verificar si la tabla existe y crearla si no existe
CREATE TABLE IF NOT EXISTS `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `creado_por` varchar(100) DEFAULT NULL,
  `actualizado_por` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_roles_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Si la tabla ya existe, agregar las columnas faltantes
ALTER TABLE `roles` 
ADD COLUMN IF NOT EXISTS `activo` tinyint(1) NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS `actualizado_en` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS `creado_por` varchar(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `actualizado_por` varchar(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP;

-- Insertar roles básicos del sistema si no existen
INSERT IGNORE INTO `roles` (`nombre`, `descripcion`, `activo`, `creado_en`, `created_at`) VALUES
('ADMIN', 'Administrador del sistema con acceso completo', 1, NOW(), NOW()),
('SUPER_ADMIN', 'Super administrador con máximos privilegios', 1, NOW(), NOW()),
('USER', 'Usuario estándar del sistema', 1, NOW(), NOW()),
('SUPERVISOR', 'Supervisor de ventas', 1, NOW(), NOW()),
('VENDEDOR', 'Vendedor de campo', 1, NOW(), NOW());

-- Verificar el resultado
SELECT * FROM `roles`;