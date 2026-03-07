-- Migration: Fix password hashes
-- Date: 2026-02-02
-- Description: Updates all user password hashes to a valid bcrypt hash for "Admin123!"
-- This bcrypt hash was generated with work factor 10 for the password "Admin123!"

USE handy_erp;

-- Update all users with the valid bcrypt hash for "Admin123!"
UPDATE Usuarios
SET password_hash = '$2a$10$rBg7FPJCxdqJQCWMU8q4Ue6P.B5kvNJQwQWCMk5qPKMqDvHJNAB2y'
WHERE password_hash LIKE '$2a$10$example%'
   OR password_hash NOT LIKE '$2a$10$%'
   OR LENGTH(password_hash) < 60;

-- Verify migration
SELECT 'Migration 18: Password hashes fixed successfully' AS status;
SELECT id, email, LEFT(password_hash, 30) AS hash_prefix FROM Usuarios;
