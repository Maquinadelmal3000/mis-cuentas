-- Ejecutar en Supabase SQL Editor ANTES de desplegar la nueva versión.
-- La columna guarda únicamente preferencias y ajustes de proyección; no altera movimientos.
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS savings_plan jsonb NOT NULL
  DEFAULT '{"overrides":{},"selected":[]}'::jsonb;
