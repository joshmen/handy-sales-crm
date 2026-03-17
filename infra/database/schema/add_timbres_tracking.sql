-- Add timbres tracking columns to existing databases
-- Run this on handy_erp database for existing deployments

-- Tenant: monthly stamp counter + reset date
ALTER TABLE "Tenants" ADD COLUMN IF NOT EXISTS timbres_usados_mes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Tenants" ADD COLUMN IF NOT EXISTS timbres_reset_fecha TIMESTAMPTZ;

-- SubscriptionPlan: max stamps per month per plan
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_timbres_mes INTEGER NOT NULL DEFAULT 0;

-- Set default timbre limits per plan
UPDATE subscription_plans SET max_timbres_mes = 0   WHERE codigo = 'FREE';
UPDATE subscription_plans SET max_timbres_mes = 100  WHERE codigo = 'BASIC';
UPDATE subscription_plans SET max_timbres_mes = 500  WHERE codigo = 'PRO';
UPDATE subscription_plans SET max_timbres_mes = 2000 WHERE codigo = 'ENTERPRISE';
