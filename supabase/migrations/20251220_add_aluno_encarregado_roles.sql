-- ============================================
-- MIGRATION: Add ALUNO and ENCARREGADO User Roles
-- Purpose: Enable students and guardians to view grades
-- Date: 2025-12-20
-- FIXED: Avoid RLS recursion using SECURITY DEFINER functions
-- ============================================

-- Step 1: Drop existing CHECK constraint on tipo_perfil
ALTER TABLE user_profiles 
    DROP CONSTRAINT IF EXISTS user_profiles_tipo_perfil_check;

-- Step 2: Add new CHECK constraint including ALUNO and ENCARREGADO
ALTER TABLE user_profiles 
    ADD CONSTRAINT user_profiles_tipo_perfil_check 
    CHECK (tipo_perfil IN ('ESCOLA', 'PROFESSOR', 'SUPERADMIN', 'ALUNO', 'ENCARREGADO'));

-- Step 3: Update superadmin escola check constraint to include new roles
ALTER TABLE user_profiles 
    DROP CONSTRAINT IF EXISTS user_profiles_superadmin_escola_check;

ALTER TABLE user_profiles 
    ADD CONSTRAINT user_profiles_superadmin_escola_check 
    CHECK (
        (tipo_perfil = 'SUPERADMIN' AND escola_id IS NULL) OR 
        (tipo_perfil != 'SUPERADMIN' AND escola_id IS NOT NULL)
    );

-- Step 4: Add encarregado_user_id column to alunos table
ALTER TABLE alunos 
    ADD COLUMN IF NOT EXISTS encarregado_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_alunos_encarregado_user_id ON alunos(encarregado_user_id);

-- ============================================
-- HELPER FUNCTIONS FOR RLS (SECURITY DEFINER to bypass RLS)
-- These functions bypass RLS to avoid infinite recursion
-- ============================================

-- Function to check if user is ALUNO (bypasses RLS)
CREATE OR REPLACE FUNCTION is_aluno()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND tipo_perfil = 'ALUNO' 
        AND ativo = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user is ENCARREGADO (bypasses RLS)
CREATE OR REPLACE FUNCTION is_encarregado()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND tipo_perfil = 'ENCARREGADO' 
        AND ativo = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get the turma_id for current ALUNO (bypasses RLS - avoids recursion)
CREATE OR REPLACE FUNCTION get_aluno_turma_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT turma_id FROM alunos 
        WHERE user_id = auth.uid() 
        AND ativo = true
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get the aluno_id for current ALUNO (bypasses RLS)
CREATE OR REPLACE FUNCTION get_aluno_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT id FROM alunos 
        WHERE user_id = auth.uid() 
        AND ativo = true
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get turma_ids for ENCARREGADO's associated students (bypasses RLS)
CREATE OR REPLACE FUNCTION get_encarregado_turma_ids()
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
        SELECT DISTINCT turma_id FROM alunos 
        WHERE encarregado_user_id = auth.uid() 
        AND ativo = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get aluno_ids for ENCARREGADO's associated students (bypasses RLS)
CREATE OR REPLACE FUNCTION get_encarregado_aluno_ids()
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
        SELECT id FROM alunos 
        WHERE encarregado_user_id = auth.uid() 
        AND ativo = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get escola_id for ALUNO via turma chain (bypasses RLS)
CREATE OR REPLACE FUNCTION get_aluno_escola_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT t.escola_id 
        FROM alunos a 
        JOIN turmas t ON t.id = a.turma_id 
        WHERE a.user_id = auth.uid() AND a.ativo = true
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- RLS POLICIES FOR ALUNO ROLE
-- Using helper functions to avoid recursion
-- ============================================

-- ALUNOS: Students can view their own profile
CREATE POLICY "ALUNO can view own aluno record"
    ON alunos FOR SELECT
    USING (is_aluno() AND user_id = auth.uid());

-- TURMAS: Students can view their own turma (using function to avoid recursion)
CREATE POLICY "ALUNO can view own turma"
    ON turmas FOR SELECT
    USING (is_aluno() AND id = get_aluno_turma_id());

-- ESCOLAS: Students can view their escola
CREATE POLICY "ALUNO can view own escola"
    ON escolas FOR SELECT
    USING (is_aluno() AND id = get_aluno_escola_id());

-- DISCIPLINAS: Students can view disciplinas from their turma
CREATE POLICY "ALUNO can view own disciplinas"
    ON disciplinas FOR SELECT
    USING (is_aluno() AND turma_id = get_aluno_turma_id());

-- COMPONENTES_AVALIACAO: Students can view components from their disciplinas
CREATE POLICY "ALUNO can view own componentes"
    ON componentes_avaliacao FOR SELECT
    USING (is_aluno() AND turma_id = get_aluno_turma_id());

-- NOTAS: Students can view their own grades
CREATE POLICY "ALUNO can view own notas"
    ON notas FOR SELECT
    USING (is_aluno() AND aluno_id = get_aluno_id());

-- NOTAS_FINAIS: Students can view their own final grades
CREATE POLICY "ALUNO can view own notas_finais"
    ON notas_finais FOR SELECT
    USING (is_aluno() AND aluno_id = get_aluno_id());

-- ============================================
-- RLS POLICIES FOR ENCARREGADO ROLE
-- Using helper functions to avoid recursion
-- ============================================

-- ALUNOS: Guardians can view students they are linked to
CREATE POLICY "ENCARREGADO can view associated alunos"
    ON alunos FOR SELECT
    USING (is_encarregado() AND encarregado_user_id = auth.uid());

-- TURMAS: Guardians can view turmas of their associated students
CREATE POLICY "ENCARREGADO can view associated turmas"
    ON turmas FOR SELECT
    USING (is_encarregado() AND id IN (SELECT get_encarregado_turma_ids()));

-- ESCOLAS: Guardians can view escolas of their associated students
CREATE POLICY "ENCARREGADO can view associated escolas"
    ON escolas FOR SELECT
    USING (
        is_encarregado() AND 
        id IN (
            SELECT t.escola_id 
            FROM turmas t 
            WHERE t.id IN (SELECT get_encarregado_turma_ids())
        )
    );

-- DISCIPLINAS: Guardians can view disciplinas from associated students' turmas
CREATE POLICY "ENCARREGADO can view associated disciplinas"
    ON disciplinas FOR SELECT
    USING (is_encarregado() AND turma_id IN (SELECT get_encarregado_turma_ids()));

-- COMPONENTES_AVALIACAO: Guardians can view components from associated disciplinas
CREATE POLICY "ENCARREGADO can view associated componentes"
    ON componentes_avaliacao FOR SELECT
    USING (is_encarregado() AND turma_id IN (SELECT get_encarregado_turma_ids()));

-- NOTAS: Guardians can view grades of associated students
CREATE POLICY "ENCARREGADO can view associated notas"
    ON notas FOR SELECT
    USING (is_encarregado() AND aluno_id IN (SELECT get_encarregado_aluno_ids()));

-- NOTAS_FINAIS: Guardians can view final grades of associated students
CREATE POLICY "ENCARREGADO can view associated notas_finais"
    ON notas_finais FOR SELECT
    USING (is_encarregado() AND aluno_id IN (SELECT get_encarregado_aluno_ids()));

-- ============================================
-- USER_PROFILES: Both roles can view their own profile
-- ============================================

CREATE POLICY "ALUNO can view own user_profile"
    ON user_profiles FOR SELECT
    USING (is_aluno() AND user_id = auth.uid());

CREATE POLICY "ENCARREGADO can view own user_profile"
    ON user_profiles FOR SELECT
    USING (is_encarregado() AND user_id = auth.uid());

-- ============================================
-- TRIGGER: Auto-create ALUNO profile when aluno.user_id is set
-- ============================================

CREATE OR REPLACE FUNCTION create_aluno_profile()
RETURNS TRIGGER AS $$
DECLARE
    aluno_escola_id UUID;
BEGIN
    -- Only create profile if user_id is set
    IF NEW.user_id IS NOT NULL THEN
        -- Get escola_id via turma
        SELECT t.escola_id INTO aluno_escola_id
        FROM turmas t
        WHERE t.id = NEW.turma_id;
        
        IF aluno_escola_id IS NOT NULL THEN
            INSERT INTO user_profiles (user_id, tipo_perfil, escola_id, ativo)
            VALUES (NEW.user_id, 'ALUNO', aluno_escola_id, NEW.ativo)
            ON CONFLICT (user_id) DO UPDATE 
            SET ativo = NEW.ativo, escola_id = aluno_escola_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_create_aluno_profile ON alunos;
CREATE TRIGGER trigger_create_aluno_profile
    AFTER INSERT OR UPDATE OF user_id, ativo, turma_id ON alunos
    FOR EACH ROW
    EXECUTE FUNCTION create_aluno_profile();

-- ============================================
-- TRIGGER: Auto-create ENCARREGADO profile when aluno.encarregado_user_id is set
-- ============================================

CREATE OR REPLACE FUNCTION create_encarregado_profile()
RETURNS TRIGGER AS $$
DECLARE
    aluno_escola_id UUID;
BEGIN
    -- Only create profile if encarregado_user_id is set
    IF NEW.encarregado_user_id IS NOT NULL THEN
        -- Get escola_id via turma
        SELECT t.escola_id INTO aluno_escola_id
        FROM turmas t
        WHERE t.id = NEW.turma_id;
        
        IF aluno_escola_id IS NOT NULL THEN
            INSERT INTO user_profiles (user_id, tipo_perfil, escola_id, ativo)
            VALUES (NEW.encarregado_user_id, 'ENCARREGADO', aluno_escola_id, true)
            ON CONFLICT (user_id) DO UPDATE 
            SET escola_id = aluno_escola_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_create_encarregado_profile ON alunos;
CREATE TRIGGER trigger_create_encarregado_profile
    AFTER INSERT OR UPDATE OF encarregado_user_id, turma_id ON alunos
    FOR EACH ROW
    EXECUTE FUNCTION create_encarregado_profile();

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN alunos.encarregado_user_id IS 'Links guardian auth user account to student for grades viewing';
COMMENT ON FUNCTION is_aluno() IS 'RLS helper: checks if current user is authenticated as ALUNO';
COMMENT ON FUNCTION is_encarregado() IS 'RLS helper: checks if current user is authenticated as ENCARREGADO';
COMMENT ON FUNCTION get_aluno_turma_id() IS 'RLS helper: gets turma_id for current ALUNO, bypassing RLS to avoid recursion';
COMMENT ON FUNCTION get_aluno_id() IS 'RLS helper: gets aluno_id for current ALUNO, bypassing RLS to avoid recursion';

-- ============================================
-- END OF MIGRATION
-- ============================================
