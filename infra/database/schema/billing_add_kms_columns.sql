-- Add KMS envelope encryption columns to configuracion_fiscal
-- Run against handy_billing database
ALTER TABLE configuracion_fiscal ADD COLUMN IF NOT EXISTS encrypted_dek TEXT;
ALTER TABLE configuracion_fiscal ADD COLUMN IF NOT EXISTS encryption_version SMALLINT DEFAULT 1;
COMMENT ON COLUMN configuracion_fiscal.encrypted_dek IS 'KMS-encrypted Data Encryption Key (Base64)';
COMMENT ON COLUMN configuracion_fiscal.encryption_version IS '1=legacy PBKDF2, 2=KMS envelope';
