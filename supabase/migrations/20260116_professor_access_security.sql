-- ============================================
-- MIGRATION: Professor Access Security (Consolidated RLS)
-- Date: 2026-01-16
-- Purpose: Ensure professors only access turmas/disciplinas they are assigned to
-- ============================================

-- ============================================
-- PART 1: HELPER FUNCTIONS
-- ============================================

-- Function to get turma IDs for a professor
-- Uses SECURITY DEFINER to avoid RLS recursion
CREATE OR REPLACE FUNCTION get_professor_turma_ids(user_uuid UUID DEFAULT auth.uid())
RETURNS UUID[] AS $$
DECLARE
    result UUID[];
BEGIN
    SELECT ARRAY_AGG(DISTINCT tp.turma_id)
    INTO result
    FROM turma_professores tp
    JOIN professores p ON p.id = tp.professor_id
    WHERE p.user_id = user_uuid;
    
    RETURN COALESCE(result, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get disciplina IDs for a professor
CREATE OR REPLACE FUNCTION get_professor_disciplina_ids(user_uuid UUID DEFAULT auth.uid())
RETURNS UUID[] AS $$
DECLARE
    result UUID[];
BEGIN
    SELECT ARRAY_AGG(DISTINCT tp.disciplina_id)
    INTO result
    FROM turma_professores tp
    JOIN professores p ON p.id = tp.professor_id
    WHERE p.user_id = user_uuid;
    
    RETURN COALESCE(result, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if professor can grade a specific component
CREATE OR REPLACE FUNCTION can_professor_grade_component(user_uuid UUID, component_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM componentes_avaliacao ca
        JOIN disciplinas d ON d.id = ca.disciplina_id
        JOIN turma_professores tp ON tp.disciplina_id = d.id AND tp.turma_id = d.turma_id
        JOIN professores p ON p.id = tp.professor_id
        WHERE ca.id = component_uuid
        AND p.user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get professor ID from user ID
CREATE OR REPLACE FUNCTION get_professor_id(user_uuid UUID DEFAULT auth.uid())
RETURNS UUID AS $$
DECLARE
    result UUID;
BEGIN
    SELECT id INTO result
    FROM professores
    WHERE user_id = user_uuid
    LIMIT 1;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- PART 2: DROP CONFLICTING OLD POLICIES
-- ============================================

-- Turmas
DROP POLICY IF EXISTS "Professor pode ver turmas associadas" ON turmas;
DROP POLICY IF EXISTS "Professors can view their classes" ON turmas;
DROP POLICY IF EXISTS "Professors can view own classes" ON turmas;
DROP POLICY IF EXISTS "Professors can view classes where they teach" ON turmas;

-- Disciplinas
DROP POLICY IF EXISTS "Professor pode ver suas disciplinas" ON disciplinas;
DROP POLICY IF EXISTS "Professor pode atualizar suas disciplinas" ON disciplinas;
DROP POLICY IF EXISTS "Professors can view own disciplines" ON disciplinas;
DROP POLICY IF EXISTS "Professors can manage own disciplines" ON disciplinas;

-- Alunos
DROP POLICY IF EXISTS "Professor pode ver alunos das suas turmas" ON alunos;
DROP POLICY IF EXISTS "Professors can view students in their classes" ON alunos;
DROP POLICY IF EXISTS "Professors can manage students in their classes" ON alunos;

-- Componentes
DROP POLICY IF EXISTS "Professor pode ver componentes das suas disciplinas" ON componentes_avaliacao;
DROP POLICY IF EXISTS "Professor pode gerenciar componentes das suas disciplinas" ON componentes_avaliacao;
DROP POLICY IF EXISTS "Professors can view components for their disciplines" ON componentes_avaliacao;
DROP POLICY IF EXISTS "Professors can view components for their classes" ON componentes_avaliacao;
DROP POLICY IF EXISTS "Professors can manage components for their disciplines" ON componentes_avaliacao;

-- Notas
DROP POLICY IF EXISTS "Professor pode ver notas das suas turmas" ON notas;
DROP POLICY IF EXISTS "Professor pode lançar notas nas suas turmas" ON notas;
DROP POLICY IF EXISTS "Professor pode atualizar notas que lançou" ON notas;
DROP POLICY IF EXISTS "Professors can view grades for their classes" ON notas;
DROP POLICY IF EXISTS "Professors can insert grades for their classes" ON notas;
DROP POLICY IF EXISTS "Professors can update grades for their classes" ON notas;
DROP POLICY IF EXISTS "Professors can delete grades for their classes" ON notas;

-- Notas Finais
DROP POLICY IF EXISTS "Professor pode ver notas finais das suas turmas" ON notas_finais;
DROP POLICY IF EXISTS "Professor pode gerenciar notas finais das suas disciplinas" ON notas_finais;
DROP POLICY IF EXISTS "Professors can view final grades for their classes" ON notas_finais;
DROP POLICY IF EXISTS "Professors can manage final grades for their classes" ON notas_finais;

-- Formulas
DROP POLICY IF EXISTS "Professor pode ver fórmulas das suas turmas" ON formulas;
DROP POLICY IF EXISTS "Professor pode gerenciar fórmulas das suas disciplinas" ON formulas;
DROP POLICY IF EXISTS "Professors can view formulas for their classes" ON formulas;
DROP POLICY IF EXISTS "Professors can manage formulas for their classes" ON formulas;

-- ============================================
-- PART 3: CREATE NEW CONSOLIDATED POLICIES
-- ============================================

-- =====================
-- TURMAS POLICIES
-- =====================

-- Professors can only view turmas they are assigned to via turma_professores
CREATE POLICY "Professor pode ver somente turmas atribuidas"
    ON turmas FOR SELECT
    USING (
        id = ANY(get_professor_turma_ids(auth.uid()))
    );

-- =====================
-- DISCIPLINAS POLICIES
-- =====================

-- Professors can only view disciplinas they are assigned to
CREATE POLICY "Professor pode ver somente disciplinas atribuidas"
    ON disciplinas FOR SELECT
    USING (
        id = ANY(get_professor_disciplina_ids(auth.uid()))
    );

-- Professors can update only their assigned disciplinas
CREATE POLICY "Professor pode atualizar somente disciplinas atribuidas"
    ON disciplinas FOR UPDATE
    USING (
        id = ANY(get_professor_disciplina_ids(auth.uid()))
    );

-- =====================
-- ALUNOS POLICIES
-- =====================

-- Professors can only view students in their assigned turmas
CREATE POLICY "Professor pode ver somente alunos das suas turmas"
    ON alunos FOR SELECT
    USING (
        turma_id = ANY(get_professor_turma_ids(auth.uid()))
    );

-- =====================
-- COMPONENTES_AVALIACAO POLICIES
-- =====================

-- Professors can view components only for their assigned disciplinas
CREATE POLICY "Professor pode ver componentes das disciplinas atribuidas"
    ON componentes_avaliacao FOR SELECT
    USING (
        disciplina_id = ANY(get_professor_disciplina_ids(auth.uid()))
    );

-- Professors can manage components for their assigned disciplinas
CREATE POLICY "Professor pode gerenciar componentes das disciplinas atribuidas"
    ON componentes_avaliacao FOR ALL
    USING (
        disciplina_id = ANY(get_professor_disciplina_ids(auth.uid()))
    );

-- =====================
-- NOTAS POLICIES
-- =====================

-- Professors can view grades only for their assigned turmas
CREATE POLICY "Professor pode ver notas das turmas atribuidas"
    ON notas FOR SELECT
    USING (
        turma_id = ANY(get_professor_turma_ids(auth.uid()))
    );

-- Professors can INSERT grades only for:
-- 1. Turmas they are assigned to
-- 2. Components belonging to disciplinas they are assigned to
-- 3. lancado_por must be themselves
CREATE POLICY "Professor pode lancar notas somente nas disciplinas atribuidas"
    ON notas FOR INSERT
    WITH CHECK (
        -- Must be in an assigned turma
        turma_id = ANY(get_professor_turma_ids(auth.uid()))
        AND
        -- Component must belong to an assigned disciplina
        can_professor_grade_component(auth.uid(), componente_id)
        AND
        -- lancado_por must be the current professor
        lancado_por = get_professor_id(auth.uid())
    );

-- Professors can UPDATE grades only if:
-- 1. They originally entered the grade (lancado_por)
-- 2. The grade is for their assigned turma/disciplina
CREATE POLICY "Professor pode atualizar somente notas que lancou"
    ON notas FOR UPDATE
    USING (
        -- Must have originally entered the grade
        lancado_por = get_professor_id(auth.uid())
        AND
        -- Must be in an assigned turma
        turma_id = ANY(get_professor_turma_ids(auth.uid()))
    )
    WITH CHECK (
        -- Cannot change lancado_por
        lancado_por = get_professor_id(auth.uid())
    );

-- Professors can DELETE grades only if:
-- 1. They originally entered the grade (lancado_por)
-- 2. The grade is for their assigned turma
CREATE POLICY "Professor pode deletar somente notas que lancou"
    ON notas FOR DELETE
    USING (
        lancado_por = get_professor_id(auth.uid())
        AND
        turma_id = ANY(get_professor_turma_ids(auth.uid()))
    );

-- =====================
-- NOTAS_FINAIS POLICIES
-- =====================

-- Professors can view final grades only for their assigned turmas and disciplinas
CREATE POLICY "Professor pode ver notas finais das disciplinas atribuidas"
    ON notas_finais FOR SELECT
    USING (
        turma_id = ANY(get_professor_turma_ids(auth.uid()))
        AND
        disciplina_id = ANY(get_professor_disciplina_ids(auth.uid()))
    );

-- Professors can manage final grades for their assigned disciplinas
CREATE POLICY "Professor pode gerenciar notas finais das disciplinas atribuidas"
    ON notas_finais FOR ALL
    USING (
        turma_id = ANY(get_professor_turma_ids(auth.uid()))
        AND
        disciplina_id = ANY(get_professor_disciplina_ids(auth.uid()))
    );

-- =====================
-- FORMULAS POLICIES
-- =====================

-- Professors can view formulas for their assigned turmas
CREATE POLICY "Professor pode ver formulas das turmas atribuidas"
    ON formulas FOR SELECT
    USING (
        turma_id = ANY(get_professor_turma_ids(auth.uid()))
    );

-- Professors can manage formulas for their assigned disciplinas
CREATE POLICY "Professor pode gerenciar formulas das disciplinas atribuidas"
    ON formulas FOR ALL
    USING (
        turma_id = ANY(get_professor_turma_ids(auth.uid()))
        AND
        disciplina_id = ANY(get_professor_disciplina_ids(auth.uid()))
    );

-- ============================================
-- PART 4: ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON FUNCTION get_professor_turma_ids(UUID) IS 
'Returns array of turma IDs that a professor is assigned to via turma_professores.
Uses SECURITY DEFINER to avoid RLS recursion.';

COMMENT ON FUNCTION get_professor_disciplina_ids(UUID) IS 
'Returns array of disciplina IDs that a professor is assigned to via turma_professores.
Uses SECURITY DEFINER to avoid RLS recursion.';

COMMENT ON FUNCTION can_professor_grade_component(UUID, UUID) IS 
'Checks if a professor can grade a specific component based on their turma_professores assignments.';

COMMENT ON FUNCTION get_professor_id(UUID) IS 
'Returns the professor ID for a given user UUID.';

-- Policy comments
COMMENT ON POLICY "Professor pode ver somente turmas atribuidas" ON turmas IS 
'Restricts professor access to only turmas they are assigned to via turma_professores table.';

COMMENT ON POLICY "Professor pode ver somente disciplinas atribuidas" ON disciplinas IS 
'Restricts professor access to only disciplinas they are assigned to via turma_professores table.';

COMMENT ON POLICY "Professor pode lancar notas somente nas disciplinas atribuidas" ON notas IS 
'Professors can only enter grades for components belonging to their assigned disciplinas. 
Grade must be recorded with their professor_id as lancado_por.';

COMMENT ON POLICY "Professor pode atualizar somente notas que lancou" ON notas IS 
'Professors can only update grades they originally entered (lancado_por = their professor_id).';

-- ============================================
-- PART 5: CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Ensure composite indexes exist for turma_professores lookups
CREATE INDEX IF NOT EXISTS idx_turma_professores_professor_turma_disciplina 
    ON turma_professores(professor_id, turma_id, disciplina_id);

-- ============================================
-- END OF MIGRATION
-- ============================================
