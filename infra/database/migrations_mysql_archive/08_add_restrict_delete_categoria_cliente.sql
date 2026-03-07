-- Migration: Change FK on Clientes.categoria_cliente_id to RESTRICT
-- Date: 2026-02-07
-- Description: Prevent deletion of categories that have associated clients

USE handy_erp;

-- Drop the old FK with SET NULL
ALTER TABLE Clientes DROP FOREIGN KEY Clientes_ibfk_3;

-- Create new FK with RESTRICT to prevent deletion of categories with clients
ALTER TABLE Clientes ADD CONSTRAINT fk_clientes_categoria
FOREIGN KEY (categoria_cliente_id)
REFERENCES CategoriasClientes(id)
ON DELETE RESTRICT ON UPDATE CASCADE;
