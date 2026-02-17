USE handy_erp;
-- Update admin users with valid BCrypt hash for password "test123"
UPDATE Usuarios SET password_hash = '$2a$11$eTUvJkg3sBW3jEhrBpz3DeeoKTOwQb8fEhwBO1SVFhlGu0OA.vHnO'
WHERE email IN ('admin@jeyma.com', 'admin@huichol.com');
SELECT email, password_hash FROM Usuarios;
