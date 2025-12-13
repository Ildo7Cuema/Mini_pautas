-- ============================================
-- MIGRATION: Fix Alunos RLS Policies
-- Purpose: Fix permission errors in alunos table with simple RLS policies
-- Date: 2025-12-13
-- ============================================

-- STEP 1: Remove all existing alunos policies
DROP POLICY IF EXISTS "Escola pode ver seus alunos" ON alunos;
DROP POLICY IF EXISTS "Escola pode criar alunos" ON alunos;
DROP POLICY IF EXISTS "Escola pode atualizar seus alunos" ON alunos;
DROP POLICY IF EXISTS "Escola pode deletar seus alunos" ON alunos;
DROP POLICY IF EXISTS "Professor pode ver alunos das suas turmas" ON alunos;
DROP POLICY IF EXISTS "alunos_select_simple" ON alunos;
DROP POLICY IF EXISTS "alunos_insert_simple" ON alunos;
DROP POLICY IF EXISTS "alunos_update_simple" ON alunos;
DROP POLICY IF EXISTS "alunos_delete_simple" ON alunos;

-- STEP 2: Create simple policies WITHOUT complex JOINs to avoid recursion
-- SELECT: Allow access based on turma's escola_id
CREATE POLICY "alunos_select_simple"
    ON alunos FOR SELECT
    USING (
        -- Check if the aluno's turma belongs to the user's escola
        EXISTS (
            SELECT 1 FROM turmas t
            JOIN user_profiles up ON up.escola_id = t.escola_id
            WHERE t.id = alunos.turma_id 
              AND up.user_id = auth.uid()
              AND up.ativo = true
        )
    );

-- INSERT: Allow escola users to create alunos
CREATE POLICY "alunos_insert_simple"
    ON alunos FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM turmas t
            JOIN user_profiles up ON up.escola_id = t.escola_id
            WHERE t.id = alunos.turma_id 
              AND up.user_id = auth.uid()
              AND up.tipo_perfil = 'ESCOLA'
              AND up.ativo = true
        )
    );

-- UPDATE: Allow users to update alunos from their escola
CREATE POLICY "alunos_update_simple"
    ON alunos FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM turmas t
            JOIN user_profiles up ON up.escola_id = t.escola_id
            WHERE t.id = alunos.turma_id 
              AND up.user_id = auth.uid()
              AND up.ativo = true
        )
    );

-- DELETE: Allow escola users to delete alunos
CREATE POLICY "alunos_delete_simple"
    ON alunos FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM turmas t
            JOIN user_profiles up ON up.escola_id = t.escola_id
            WHERE t.id = alunos.turma_id 
              AND up.user_id = auth.uid()
              AND up.tipo_perfil = 'ESCOLA'
              AND up.ativo = true
        )
    );

-- STEP 3: Ensure RLS is enabled
ALTER TABLE alunos ENABLE ROW LEVEL SECURITY;

-- STEP 4: Verify policies were created
SELECT 
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'alunos'
ORDER BY cmd, policyname;

-- ============================================
-- NOTES:
-- - These policies use a JOIN with turmas and user_profiles
-- - They avoid recursion by not querying back to alunos
-- - They check if the aluno's turma belongs to the user's escola
-- - Only ESCOLA users can INSERT and DELETE
-- - Both ESCOLA and PROFESSOR users can SELECT and UPDATE
-- ============================================
