-- Migration: Fix notificacoes table schema
-- Purpose: Align existing table with schema.sql and new code requirements
-- Description: Renames user_id to destinatario_id, adds dados_adicionais, relaxes type check

-- 1. Rename user_id to destinatario_id if it exists, otherwise add destinatario_id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notificacoes' AND column_name = 'user_id') THEN
        ALTER TABLE notificacoes RENAME COLUMN user_id TO destinatario_id;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notificacoes' AND column_name = 'destinatario_id') THEN
        ALTER TABLE notificacoes ADD COLUMN destinatario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Add dados_adicionais if not exists
ALTER TABLE notificacoes 
ADD COLUMN IF NOT EXISTS dados_adicionais JSONB DEFAULT '{}'::jsonb;

-- 3. Add lida_em if not exists
ALTER TABLE notificacoes 
ADD COLUMN IF NOT EXISTS lida_em TIMESTAMP WITH TIME ZONE;

-- 4. Change tipo to TEXT to avoid check constraint issues with new types
-- First drop the constraint if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notificacoes_tipo_check') THEN
        ALTER TABLE notificacoes DROP CONSTRAINT notificacoes_tipo_check;
    END IF;
END $$;

-- Then change the column type
ALTER TABLE notificacoes 
ALTER COLUMN tipo TYPE TEXT;

-- 5. Refresh indexes
DROP INDEX IF EXISTS idx_notificacoes_user_id;

CREATE INDEX IF NOT EXISTS idx_notificacoes_destinatario ON notificacoes(destinatario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_destinatario_lida ON notificacoes(destinatario_id, lida, created_at DESC);
