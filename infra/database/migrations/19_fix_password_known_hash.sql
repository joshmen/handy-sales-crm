-- Migration: Fix password hashes with known working hash
-- Date: 2026-02-02
-- Description: Updates all user password hashes to BCrypt hash for "password"
-- Password: password

USE handy_erp;

-- Update all users with the valid bcrypt hash for "password"
-- This is a known working hash for the password "password"
UPDATE Usuarios
SET password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

-- Verify
SELECT 'Migration 19: Password hashes updated' AS status;
SELECT id, email, LEFT(password_hash, 40) AS hash_prefix FROM Usuarios;
