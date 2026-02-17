-- Valid BCrypt hash for password "test123" (simpler password for testing)
-- Generated using BCrypt with cost 10
UPDATE Usuarios SET password_hash = '$2a$10$EIXgqPNJFCRgMODFSJ3kLuVl9gX7kKXo1qJgHj8KpIgvK1QqXM.Gy' WHERE 1=1;
SELECT email, password_hash FROM Usuarios LIMIT 3;
