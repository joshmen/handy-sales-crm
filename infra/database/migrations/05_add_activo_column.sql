-- Add 'activo' column to Usuarios table for soft delete functionality
ALTER TABLE Usuarios 
ADD COLUMN activo TINYINT(1) DEFAULT 1 NOT NULL;

-- Update all existing users to be active by default
UPDATE Usuarios SET activo = 1 WHERE activo IS NULL;