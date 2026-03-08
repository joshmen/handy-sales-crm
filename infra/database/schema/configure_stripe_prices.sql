-- =====================================================
-- Stripe Price ID Configuration
-- Run AFTER seed_local_pg.sql to link plans to Stripe
--
-- Usage:
--   docker exec -i handysales_postgres_dev psql -U handy_user -d handy_erp < infra/database/schema/configure_stripe_prices.sql
--
-- To get Price IDs: Stripe Dashboard > Products > click each price
-- For production: replace test Price IDs with live ones
-- =====================================================

-- Plan Basico ($499/mes, $4,990/año)
UPDATE subscription_plans
SET stripe_price_id_mensual = 'price_1T8b6wQ5uhH4KukO6fqIf82T',
    stripe_price_id_anual   = 'price_1T8bApQ5uhH4Kuk0xZUvXrpL'
WHERE codigo = 'BASIC';

-- Plan Profesional ($999/mes, $9,990/año)
UPDATE subscription_plans
SET stripe_price_id_mensual = 'price_1T8b8MQ5uhH4Kuk0grAD57K7',
    stripe_price_id_anual   = 'price_1T8bBGQ5uhH4KukOEkENfWBG'
WHERE codigo = 'PRO';

-- Verify
SELECT codigo, nombre, precio_mensual, stripe_price_id_mensual, stripe_price_id_anual
FROM subscription_plans
ORDER BY orden;
