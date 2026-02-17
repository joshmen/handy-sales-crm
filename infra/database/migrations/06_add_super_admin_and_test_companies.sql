-- Add 'es_super_admin' column to Usuarios table
ALTER TABLE Usuarios 
ADD COLUMN es_super_admin TINYINT(1) DEFAULT 0 NOT NULL;

-- Update existing admin2@handysales.com to be Super Admin (that's you)
UPDATE Usuarios SET es_super_admin = 1, es_admin = 1 WHERE email = 'admin2@handysales.com';

-- Insert test companies (Tenants)
INSERT INTO Tenants (nombre_empresa, rfc, contacto, activo, creado_en, creado_por) VALUES
('Jeyma S.A. de CV', 'JEY123456789', 'Director General Jeyma', 1, NOW(), 'system'),
('Huichol Especias S.A. de CV', 'HUE987654321', 'Director General Huichol', 1, NOW(), 'system');

-- Create admin users for each company
-- Password for all users: "test123" (valid BCrypt hash)
INSERT INTO Usuarios (tenant_id, email, password_hash, nombre, es_admin, es_super_admin, activo, creado_en, creado_por) VALUES
((SELECT id FROM Tenants WHERE nombre_empresa = 'Jeyma S.A. de CV'), 'admin@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Administrador Jeyma', 1, 0, 1, NOW(), 'system'),
((SELECT id FROM Tenants WHERE nombre_empresa = 'Huichol Especias S.A. de CV'), 'admin@huichol.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Administrador Huichol', 1, 0, 1, NOW(), 'system');

-- Create some sample employees for each company
-- Password for all users: "test123" (valid BCrypt hash)
INSERT INTO Usuarios (tenant_id, email, password_hash, nombre, es_admin, es_super_admin, activo, creado_en, creado_por) VALUES
-- Jeyma employees
((SELECT id FROM Tenants WHERE nombre_empresa = 'Jeyma S.A. de CV'), 'vendedor1@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Juan Vendedor Jeyma', 0, 0, 1, NOW(), 'system'),
((SELECT id FROM Tenants WHERE nombre_empresa = 'Jeyma S.A. de CV'), 'vendedor2@jeyma.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Maria Vendedor Jeyma', 0, 0, 1, NOW(), 'system'),
-- Huichol employees
((SELECT id FROM Tenants WHERE nombre_empresa = 'Huichol Especias S.A. de CV'), 'vendedor1@huichol.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Pedro Vendedor Huichol', 0, 0, 1, NOW(), 'system'),
((SELECT id FROM Tenants WHERE nombre_empresa = 'Huichol Especias S.A. de CV'), 'vendedor2@huichol.com', '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO', 'Ana Vendedor Huichol', 0, 0, 1, NOW(), 'system');