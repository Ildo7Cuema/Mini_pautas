-- Migration: Fix disciplinas_obrigatorias RLS policies for ESCOLA profile
-- Description: Add policies to allow ESCOLA users to manage disciplinas_obrigatorias for their turmas
-- Date: 2026-01-05
-- Issue: School profile was getting "Você não tem permissão para esta operação" error

-- ============================================
-- DROP EXISTING POLICIES
-- ============================================

-- Drop old policies that only allowed professors
DROP POLICY IF EXISTS "Users can view disciplinas_obrigatorias for their turmas" ON disciplinas_obrigatorias;
DROP POLICY IF EXISTS "Users can insert disciplinas_obrigatorias for their turmas" ON disciplinas_obrigatorias;
DROP POLICY IF EXISTS "Users can update disciplinas_obrigatorias for their turmas" ON disciplinas_obrigatorias;
DROP POLICY IF EXISTS "Users can delete disciplinas_obrigatorias for their turmas" ON disciplinas_obrigatorias;

-- ============================================
-- CREATE NEW POLICIES THAT INCLUDE ESCOLA PROFILE
-- ============================================

-- SELECT policy: Allow both professors and escolas to view
CREATE POLICY "Users can view disciplinas_obrigatorias for their turmas"
ON disciplinas_obrigatorias FOR SELECT
USING (
    -- Escolas can view all disciplinas_obrigatorias for turmas in their school
    turma_id IN (
        SELECT t.id FROM turmas t
        WHERE t.escola_id = get_current_user_escola_id()
    )
    OR
    -- Professors can view disciplinas_obrigatorias for their assigned turmas
    turma_id IN (
        SELECT t.id FROM turmas t
        JOIN professores p ON t.professor_id = p.id
        WHERE p.user_id = auth.uid()
    )
);

-- INSERT policy: Allow both professors and escolas to insert
CREATE POLICY "Users can insert disciplinas_obrigatorias for their turmas"
ON disciplinas_obrigatorias FOR INSERT
WITH CHECK (
    -- Escolas can insert disciplinas_obrigatorias for turmas in their school
    turma_id IN (
        SELECT t.id FROM turmas t
        WHERE t.escola_id = get_current_user_escola_id()
    )
    OR
    -- Professors can insert disciplinas_obrigatorias for their assigned turmas
    turma_id IN (
        SELECT t.id FROM turmas t
        JOIN professores p ON t.professor_id = p.id
        WHERE p.user_id = auth.uid()
    )
);

-- UPDATE policy: Allow both professors and escolas to update
CREATE POLICY "Users can update disciplinas_obrigatorias for their turmas"
ON disciplinas_obrigatorias FOR UPDATE
USING (
    -- Escolas can update disciplinas_obrigatorias for turmas in their school
    turma_id IN (
        SELECT t.id FROM turmas t
        WHERE t.escola_id = get_current_user_escola_id()
    )
    OR
    -- Professors can update disciplinas_obrigatorias for their assigned turmas
    turma_id IN (
        SELECT t.id FROM turmas t
        JOIN professores p ON t.professor_id = p.id
        WHERE p.user_id = auth.uid()
    )
);

-- DELETE policy: Allow both professors and escolas to delete
CREATE POLICY "Users can delete disciplinas_obrigatorias for their turmas"
ON disciplinas_obrigatorias FOR DELETE
USING (
    -- Escolas can delete disciplinas_obrigatorias for turmas in their school
    turma_id IN (
        SELECT t.id FROM turmas t
        WHERE t.escola_id = get_current_user_escola_id()
    )
    OR
    -- Professors can delete disciplinas_obrigatorias for their assigned turmas
    turma_id IN (
        SELECT t.id FROM turmas t
        JOIN professores p ON t.professor_id = p.id
        WHERE p.user_id = auth.uid()
    )
);

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify the new policies exist
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'The ESCOLA profile can now manage disciplinas_obrigatorias for their turmas.';
END $$;
