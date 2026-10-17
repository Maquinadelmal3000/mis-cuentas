-- Mis Cuentas · SQL incremental 001 — modalidad de cuotas
-- Necesario para el código modificado hasta ahora (interruptor "Confirmación manual de cuotas").
-- Seguro: no borra ni modifica datos existentes; se puede ejecutar más de una vez.
-- EJECUTAR ANTES de publicar la nueva versión (si no, al guardar la configuración Supabase rechazará la columna nueva).

alter table public.user_settings
  add column if not exists manual_installments boolean not null default false;

-- false = cuotas por mes calendario (automático, por defecto)
-- true  = confirmación manual de cuotas
-- Las políticas RLS existentes de user_settings siguen valiendo (son por fila, no por columna).
