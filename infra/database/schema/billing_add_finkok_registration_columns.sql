-- ─────────────────────────────────────────────────────────────────────────────
-- BILL-1 (2026-05-26): Finkok registration tracking en configuracion_fiscal
-- ─────────────────────────────────────────────────────────────────────────────
-- Cuando un tenant sube su CSD, además de guardarlo localmente se registra
-- en Finkok como emisor bajo nuestra cuenta partner via SOAP `registration.add`.
-- Estas columnas reflejan el resultado de ese registro + permiten sync periódico.
--
-- Run against handy_billing database.

ALTER TABLE configuracion_fiscal
    ADD COLUMN IF NOT EXISTS finkok_emisor_registrado BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE configuracion_fiscal
    ADD COLUMN IF NOT EXISTS finkok_registrado_en TIMESTAMP WITHOUT TIME ZONE;

ALTER TABLE configuracion_fiscal
    ADD COLUMN IF NOT EXISTS finkok_status VARCHAR(20);

ALTER TABLE configuracion_fiscal
    ADD COLUMN IF NOT EXISTS finkok_type_user CHAR(1);

ALTER TABLE configuracion_fiscal
    ADD COLUMN IF NOT EXISTS finkok_creditos_restantes INTEGER;

COMMENT ON COLUMN configuracion_fiscal.finkok_emisor_registrado IS 'True si registration.add a Finkok fue exitoso. Si false → timbrado fallará porque Finkok no reconoce el RFC.';
COMMENT ON COLUMN configuracion_fiscal.finkok_registrado_en IS 'Timestamp del registro exitoso en Finkok.';
COMMENT ON COLUMN configuracion_fiscal.finkok_status IS '"active" | "suspended" | "frozen" según Finkok.';
COMMENT ON COLUMN configuracion_fiscal.finkok_type_user IS '"P" = prepago (créditos via assign), "O" = ilimitado (tarifa mensual).';
COMMENT ON COLUMN configuracion_fiscal.finkok_creditos_restantes IS 'Créditos prepago restantes. Null si TypeUser=O o nunca consultado.';
