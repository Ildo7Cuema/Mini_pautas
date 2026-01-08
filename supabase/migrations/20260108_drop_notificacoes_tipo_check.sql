-- Migration: Drop notificacoes_tipo_check constraint
-- Purpose: Allow new notification types like 'nova_circular_municipal'
-- Date: 2026-01-08

-- Drop the tipo check constraint if it exists
ALTER TABLE notificacoes DROP CONSTRAINT IF EXISTS notificacoes_tipo_check;

-- Also ensure the column is TEXT type (not VARCHAR with restriction)
ALTER TABLE notificacoes ALTER COLUMN tipo TYPE TEXT;
