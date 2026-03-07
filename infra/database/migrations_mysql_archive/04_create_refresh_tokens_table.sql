-- Crear tabla para Refresh Tokens
CREATE TABLE RefreshTokens (
    Id INT PRIMARY KEY AUTO_INCREMENT,
    Token VARCHAR(255) NOT NULL UNIQUE,
    UserId INT NOT NULL,
    ExpiresAt DATETIME NOT NULL,
    IsRevoked BOOLEAN DEFAULT FALSE,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    RevokedAt DATETIME NULL,
    ReplacedByToken VARCHAR(255) NULL,
    
    FOREIGN KEY (UserId) REFERENCES Usuarios(id) ON DELETE CASCADE,
    INDEX idx_refresh_token (Token),
    INDEX idx_user_id (UserId),
    INDEX idx_expires_at (ExpiresAt)
);

-- Limpiar tokens expirados (para mantenimiento)
-- DELETE FROM RefreshTokens WHERE ExpiresAt < NOW() OR IsRevoked = TRUE;