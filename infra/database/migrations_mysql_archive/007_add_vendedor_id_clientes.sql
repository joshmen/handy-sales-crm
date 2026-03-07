-- Migration: Add vendedor_id to Clientes table
-- Date: 2026-02-11
-- Purpose: RBAC - Allow assigning clients to specific vendedores

USE handy_erp;

-- Add vendedor_id column
ALTER TABLE Clientes ADD COLUMN vendedor_id INT NULL AFTER categoria_cliente_id;

-- Add foreign key constraint
ALTER TABLE Clientes ADD CONSTRAINT fk_clientes_vendedor
  FOREIGN KEY (vendedor_id) REFERENCES Usuarios(id) ON DELETE SET NULL;

-- Add index for performance (tenant + vendedor queries)
CREATE INDEX idx_clientes_vendedor ON Clientes(tenant_id, vendedor_id);
