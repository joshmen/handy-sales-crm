-- ========================================
-- HandySales - Announcement DisplayMode
-- Script: 16_announcement_display_mode.sql
-- Fecha: 2026-02-19
-- ========================================

USE handy_erp;

-- Add display_mode column to Announcements
-- 0=Banner (top bar only), 1=Notification (bell only), 2=Both
ALTER TABLE Announcements ADD COLUMN display_mode INT NOT NULL DEFAULT 0 COMMENT '0=Banner, 1=Notification, 2=Both';

SELECT 'Migración 16: Announcement DisplayMode aplicada exitosamente' AS resultado;
