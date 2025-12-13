-- ============================================
-- MIGRATION: Fix Professor RLS Policies
-- Date: 2025-12-13
-- Purpose: Fix Row Level Security policies to allow professors to access their data
-- ============================================

-- ============================================
-- 1. FIX DISCIPLINAS POLICIES
-- ============================================

-- Remove old policy if exists
DROP POLICY IF EXISTS "Professors can view own disciplines" ON disciplinas;

-- Create correct policy for professors to view their disciplines
CREATE POLICY "Professors can view own disciplines"
    ON disciplinas FOR SELECT
    USING (
        professor_id IN (
            SELECT id FROM professores WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- 2. FIX TURMAS POLICIES (Avoid infinite recursion)
-- ============================================

-- Remove problematic policy that causes recursion
DROP POLICY IF EXISTS "Professors can view classes where they teach" ON turmas;
DROP POLICY IF EXISTS "Professors can view own classes" ON turmas;

-- Create helper function to avoid recursion
CREATE OR REPLACE FUNCTION is_professor_of_turma(turma_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM disciplinas d
        JOIN professores p ON p.id = d.professor_id
        WHERE d.turma_id = turma_uuid
        AND p.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policy using the helper function
CREATE POLICY "Professors can view their classes"
    ON turmas FOR SELECT
    USING (is_professor_of_turma(id));

-- ============================================
-- 3. FIX COMPONENTES_AVALIACAO POLICIES
-- ============================================

-- Remove old policies if exist
DROP POLICY IF EXISTS "Professors can view components for their disciplines" ON componentes_avaliacao;
DROP POLICY IF EXISTS "Professors can view components for their classes" ON componentes_avaliacao;

-- Create policy for professors to view components of their disciplines
CREATE POLICY "Professors can view components for their disciplines"
    ON componentes_avaliacao FOR SELECT
    USING (
        disciplina_id IN (
            SELECT id FROM disciplinas 
            WHERE professor_id IN (
                SELECT id FROM professores WHERE user_id = auth.uid()
            )
        )
    );

-- Create policy for professors to view components by turma
CREATE POLICY "Professors can view components for their classes"
    ON componentes_avaliacao FOR SELECT
    USING (
        turma_id IN (
            SELECT DISTINCT d.turma_id 
            FROM disciplinas d
            WHERE d.professor_id IN (
                SELECT id FROM professores WHERE user_id = auth.uid()
            )
        )
    );

-- ============================================
-- 4. VERIFY ALUNOS POLICIES
-- ============================================

-- Ensure professors can view students in their classes
DROP POLICY IF EXISTS "Professors can view students in their classes" ON alunos;

CREATE POLICY "Professors can view students in their classes"
    ON alunos FOR SELECT
    USING (
        turma_id IN (
            SELECT DISTINCT d.turma_id 
            FROM disciplinas d
            WHERE d.professor_id IN (
                SELECT id FROM professores WHERE user_id = auth.uid()
            )
        )
    );

-- ============================================
-- 5. VERIFY NOTAS POLICIES
-- ============================================

-- Ensure professors can view and manage grades for their classes
DROP POLICY IF EXISTS "Professors can view grades for their classes" ON notas;

CREATE POLICY "Professors can view grades for their classes"
    ON notas FOR SELECT
    USING (
        turma_id IN (
            SELECT DISTINCT d.turma_id 
            FROM disciplinas d
            WHERE d.professor_id IN (
                SELECT id FROM professores WHERE user_id = auth.uid()
            )
        )
    );

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON FUNCTION is_professor_of_turma(UUID) IS 
'Helper function to check if current user is a professor of a given turma. 
Used to avoid infinite recursion in RLS policies.';

COMMENT ON POLICY "Professors can view their classes" ON turmas IS 
'Allows professors to view turmas where they teach disciplines. 
Uses helper function to avoid recursion.';

COMMENT ON POLICY "Professors can view components for their disciplines" ON componentes_avaliacao IS 
'Allows professors to view evaluation components for their disciplines.';

COMMENT ON POLICY "Professors can view components for their classes" ON componentes_avaliacao IS 
'Allows professors to view evaluation components for their classes (by turma_id).';
