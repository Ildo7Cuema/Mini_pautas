-- ============================================
-- MIGRATION: Add SUPERADMIN Support
-- Purpose: Extend user roles to include SUPERADMIN with system-wide access
-- Date: 2025-12-16
-- ============================================

-- Step 1: Make escola_id nullable in user_profiles (only for SUPERADMIN)
ALTER TABLE user_profiles 
    ALTER COLUMN escola_id DROP NOT NULL;

-- Step 2: Drop existing CHECK constraint on tipo_perfil
ALTER TABLE user_profiles 
    DROP CONSTRAINT IF EXISTS user_profiles_tipo_perfil_check;

-- Step 3: Add new CHECK constraint including SUPERADMIN
ALTER TABLE user_profiles 
    ADD CONSTRAINT user_profiles_tipo_perfil_check 
    CHECK (tipo_perfil IN ('ESCOLA', 'PROFESSOR', 'SUPERADMIN'));

-- Step 4: Add constraint to ensure only SUPERADMIN can have null escola_id
ALTER TABLE user_profiles 
    ADD CONSTRAINT user_profiles_superadmin_escola_check 
    CHECK (
        (tipo_perfil = 'SUPERADMIN' AND escola_id IS NULL) OR 
        (tipo_perfil != 'SUPERADMIN' AND escola_id IS NOT NULL)
    );

-- Step 5: Add escola status fields
ALTER TABLE escolas 
    ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS bloqueado BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS bloqueado_motivo TEXT,
    ADD COLUMN IF NOT EXISTS bloqueado_em TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS bloqueado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Step 6: Create indexes for escola status fields
CREATE INDEX IF NOT EXISTS idx_escolas_ativo ON escolas(ativo);
CREATE INDEX IF NOT EXISTS idx_escolas_bloqueado ON escolas(bloqueado);
CREATE INDEX IF NOT EXISTS idx_escolas_status ON escolas(ativo, bloqueado);

-- Step 7: Add comments for documentation
COMMENT ON COLUMN escolas.ativo IS 'Whether the school is active in the system';
COMMENT ON COLUMN escolas.bloqueado IS 'Whether the school has been blocked by SUPERADMIN';
COMMENT ON COLUMN escolas.bloqueado_motivo IS 'Reason for blocking the school';
COMMENT ON COLUMN escolas.bloqueado_em IS 'Timestamp when the school was blocked';
COMMENT ON COLUMN escolas.bloqueado_por IS 'SUPERADMIN user who blocked the school';

-- Step 8: Update existing RLS policies to grant SUPERADMIN full access

-- Helper function to check if user is SUPERADMIN
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND tipo_perfil = 'SUPERADMIN' 
        AND ativo = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant SUPERADMIN full access to escolas
CREATE POLICY "SUPERADMIN can view all escolas"
    ON escolas FOR SELECT
    USING (is_superadmin());

CREATE POLICY "SUPERADMIN can insert escolas"
    ON escolas FOR INSERT
    WITH CHECK (is_superadmin());

CREATE POLICY "SUPERADMIN can update all escolas"
    ON escolas FOR UPDATE
    USING (is_superadmin());

CREATE POLICY "SUPERADMIN can delete escolas"
    ON escolas FOR DELETE
    USING (is_superadmin());

-- Grant SUPERADMIN full access to professores
CREATE POLICY "SUPERADMIN can view all professores"
    ON professores FOR SELECT
    USING (is_superadmin());

CREATE POLICY "SUPERADMIN can insert professores"
    ON professores FOR INSERT
    WITH CHECK (is_superadmin());

CREATE POLICY "SUPERADMIN can update all professores"
    ON professores FOR UPDATE
    USING (is_superadmin());

CREATE POLICY "SUPERADMIN can delete professores"
    ON professores FOR DELETE
    USING (is_superadmin());

-- Grant SUPERADMIN full access to turmas
CREATE POLICY "SUPERADMIN can view all turmas"
    ON turmas FOR SELECT
    USING (is_superadmin());

CREATE POLICY "SUPERADMIN can insert turmas"
    ON turmas FOR INSERT
    WITH CHECK (is_superadmin());

CREATE POLICY "SUPERADMIN can update all turmas"
    ON turmas FOR UPDATE
    USING (is_superadmin());

CREATE POLICY "SUPERADMIN can delete turmas"
    ON turmas FOR DELETE
    USING (is_superadmin());

-- Grant SUPERADMIN full access to alunos
CREATE POLICY "SUPERADMIN can view all alunos"
    ON alunos FOR SELECT
    USING (is_superadmin());

CREATE POLICY "SUPERADMIN can insert alunos"
    ON alunos FOR INSERT
    WITH CHECK (is_superadmin());

CREATE POLICY "SUPERADMIN can update all alunos"
    ON alunos FOR UPDATE
    USING (is_superadmin());

CREATE POLICY "SUPERADMIN can delete alunos"
    ON alunos FOR DELETE
    USING (is_superadmin());

-- Grant SUPERADMIN full access to disciplinas
CREATE POLICY "SUPERADMIN can view all disciplinas"
    ON disciplinas FOR SELECT
    USING (is_superadmin());

CREATE POLICY "SUPERADMIN can insert disciplinas"
    ON disciplinas FOR INSERT
    WITH CHECK (is_superadmin());

CREATE POLICY "SUPERADMIN can update all disciplinas"
    ON disciplinas FOR UPDATE
    USING (is_superadmin());

CREATE POLICY "SUPERADMIN can delete disciplinas"
    ON disciplinas FOR DELETE
    USING (is_superadmin());

-- Grant SUPERADMIN full access to componentes_avaliacao
CREATE POLICY "SUPERADMIN can view all componentes"
    ON componentes_avaliacao FOR SELECT
    USING (is_superadmin());

CREATE POLICY "SUPERADMIN can insert componentes"
    ON componentes_avaliacao FOR INSERT
    WITH CHECK (is_superadmin());

CREATE POLICY "SUPERADMIN can update all componentes"
    ON componentes_avaliacao FOR UPDATE
    USING (is_superadmin());

CREATE POLICY "SUPERADMIN can delete componentes"
    ON componentes_avaliacao FOR DELETE
    USING (is_superadmin());

-- Grant SUPERADMIN full access to formulas
CREATE POLICY "SUPERADMIN can view all formulas"
    ON formulas FOR SELECT
    USING (is_superadmin());

CREATE POLICY "SUPERADMIN can insert formulas"
    ON formulas FOR INSERT
    WITH CHECK (is_superadmin());

CREATE POLICY "SUPERADMIN can update all formulas"
    ON formulas FOR UPDATE
    USING (is_superadmin());

CREATE POLICY "SUPERADMIN can delete formulas"
    ON formulas FOR DELETE
    USING (is_superadmin());

-- Grant SUPERADMIN full access to notas
CREATE POLICY "SUPERADMIN can view all notas"
    ON notas FOR SELECT
    USING (is_superadmin());

CREATE POLICY "SUPERADMIN can insert notas"
    ON notas FOR INSERT
    WITH CHECK (is_superadmin());

CREATE POLICY "SUPERADMIN can update all notas"
    ON notas FOR UPDATE
    USING (is_superadmin());

CREATE POLICY "SUPERADMIN can delete notas"
    ON notas FOR DELETE
    USING (is_superadmin());

-- Grant SUPERADMIN full access to notas_finais
CREATE POLICY "SUPERADMIN can view all notas_finais"
    ON notas_finais FOR SELECT
    USING (is_superadmin());

CREATE POLICY "SUPERADMIN can insert notas_finais"
    ON notas_finais FOR INSERT
    WITH CHECK (is_superadmin());

CREATE POLICY "SUPERADMIN can update all notas_finais"
    ON notas_finais FOR UPDATE
    USING (is_superadmin());

CREATE POLICY "SUPERADMIN can delete notas_finais"
    ON notas_finais FOR DELETE
    USING (is_superadmin());

-- Grant SUPERADMIN full access to auditoria
CREATE POLICY "SUPERADMIN can view all auditoria"
    ON auditoria FOR SELECT
    USING (is_superadmin());

-- Grant SUPERADMIN full access to notificacoes
CREATE POLICY "SUPERADMIN can view all notificacoes"
    ON notificacoes FOR SELECT
    USING (is_superadmin());

CREATE POLICY "SUPERADMIN can insert notificacoes"
    ON notificacoes FOR INSERT
    WITH CHECK (is_superadmin());

CREATE POLICY "SUPERADMIN can update all notificacoes"
    ON notificacoes FOR UPDATE
    USING (is_superadmin());

-- Grant SUPERADMIN full access to configuracoes_sistema
CREATE POLICY "SUPERADMIN can view all configuracoes"
    ON configuracoes_sistema FOR SELECT
    USING (is_superadmin());

CREATE POLICY "SUPERADMIN can insert configuracoes"
    ON configuracoes_sistema FOR INSERT
    WITH CHECK (is_superadmin());

CREATE POLICY "SUPERADMIN can update all configuracoes"
    ON configuracoes_sistema FOR UPDATE
    USING (is_superadmin());

CREATE POLICY "SUPERADMIN can delete configuracoes"
    ON configuracoes_sistema FOR DELETE
    USING (is_superadmin());

-- Grant SUPERADMIN full access to user_profiles
CREATE POLICY "SUPERADMIN can view all user_profiles"
    ON user_profiles FOR SELECT
    USING (is_superadmin());

CREATE POLICY "SUPERADMIN can insert user_profiles"
    ON user_profiles FOR INSERT
    WITH CHECK (is_superadmin());

CREATE POLICY "SUPERADMIN can update all user_profiles"
    ON user_profiles FOR UPDATE
    USING (is_superadmin());

-- Note: We don't allow SUPERADMIN deletion via policy - handled by seed constraint

-- ============================================
-- END OF MIGRATION
-- ============================================
