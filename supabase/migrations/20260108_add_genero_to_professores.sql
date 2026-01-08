-- ============================================
-- MIGRATION: Add gender field to professores table
-- Purpose: Enable gender-based statistics on municipal dashboard
-- Date: 2026-01-08
-- ============================================

-- Add genero column to professores table
ALTER TABLE professores ADD COLUMN IF NOT EXISTS genero TEXT
    CHECK (genero IS NULL OR genero IN ('M', 'F'));

-- Create index for efficient filtering by gender
CREATE INDEX IF NOT EXISTS idx_professores_genero ON professores(genero);

-- Add documentation
COMMENT ON COLUMN professores.genero IS 'Gender: M (Masculino) or F (Feminino)';

-- ============================================
-- END OF MIGRATION
-- ============================================
