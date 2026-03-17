-- Add Azure Blob Storage URLs and PAC columns to billing DB
-- Run against handy_billing database for existing installations
-- For fresh DBs, EnsureCreated() handles this automatically.

-- Factura: blob storage URLs
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS xml_blob_url VARCHAR(500);
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS pdf_blob_url VARCHAR(500);
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS no_certificado_emisor VARCHAR(50);
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS acuse_cancelacion TEXT;

-- ConfiguracionFiscal: PAC Finkok credentials
ALTER TABLE configuracion_fiscal ADD COLUMN IF NOT EXISTS pac_usuario VARCHAR(200);
ALTER TABLE configuracion_fiscal ADD COLUMN IF NOT EXISTS pac_password VARCHAR(200);
ALTER TABLE configuracion_fiscal ADD COLUMN IF NOT EXISTS pac_ambiente VARCHAR(20) DEFAULT 'sandbox';
