-- =============================================================================
-- Migration: 20250101000016_waybill_format_settings.sql
-- Description: Add configurable waybill format and printing preferences to tenant_settings
-- =============================================================================

ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS waybill_format TEXT NOT NULL DEFAULT 'THERMAL_3INCH'
    CHECK (waybill_format IN ('THERMAL_3INCH', 'A4_STANDARD', 'A5_LANDSCAPE')),
  ADD COLUMN IF NOT EXISTS waybill_copies INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS show_gst_breakdown BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_tracking_qr BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_terms_on_print BOOLEAN NOT NULL DEFAULT true;
