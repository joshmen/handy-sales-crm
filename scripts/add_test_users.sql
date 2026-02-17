USE handy_erp;

-- Insert test companies (Tenants) if not exist
INSERT IGNORE INTO Tenants (id, nombre_empresa, rfc, contacto, activo, creado_en, creado_por) VALUES
(3, 'Jeyma S.A. de CV', 'JEY123456789', 'Director General Jeyma', 1, NOW(), 'system'),
(4, 'Huichol Especias S.A. de CV', 'HUE987654321', 'Director General Huichol', 1, NOW(), 'system');

-- Create admin users - Password: "test123" (simple for testing)
-- BCrypt hash generated for "test123": $2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa
INSERT INTO Usuarios (tenant_id, email, password_hash, nombre, es_admin, activo, creado_en, creado_por) VALUES
(3, 'admin@jeyma.com', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'Administrador Jeyma', 1, 1, NOW(), 'system'),
(4, 'admin@huichol.com', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'Administrador Huichol', 1, 1, NOW(), 'system')
ON DUPLICATE KEY UPDATE password_hash = '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa';

-- Verify
SELECT id, email, LEFT(password_hash, 20) as hash, es_admin FROM Usuarios;
