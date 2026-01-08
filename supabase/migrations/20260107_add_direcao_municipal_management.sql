-- ============================================
-- MIGRATION: Add Direção Municipal Management Fields
-- Purpose: Add block/unblock functionality for municipal directions
-- Date: 2026-01-07
-- ============================================

-- Add bloqueado fields to direcoes_municipais table
ALTER TABLE direcoes_municipais 
ADD COLUMN IF NOT EXISTS bloqueado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bloqueado_motivo TEXT,
ADD COLUMN IF NOT EXISTS bloqueado_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS bloqueado_por UUID REFERENCES auth.users(id);

-- Create index for bloqueado status
CREATE INDEX IF NOT EXISTS idx_direcoes_municipais_bloqueado ON direcoes_municipais(bloqueado);
CREATE INDEX IF NOT EXISTS idx_direcoes_municipais_ativo ON direcoes_municipais(ativo);

-- Add comments
COMMENT ON COLUMN direcoes_municipais.bloqueado IS 'Whether the municipal direction is blocked';
COMMENT ON COLUMN direcoes_municipais.bloqueado_motivo IS 'Reason for blocking';
COMMENT ON COLUMN direcoes_municipais.bloqueado_em IS 'When it was blocked';
COMMENT ON COLUMN direcoes_municipais.bloqueado_por IS 'Who blocked it';

-- ============================================
-- END OF MIGRATION
-- ============================================
