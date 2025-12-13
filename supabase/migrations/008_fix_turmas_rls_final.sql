-- ============================================
-- FINAL MIGRATION: Fix Turmas RLS Policies (WORKING SOLUTION)
-- Purpose: Fix infinite recursion and permission errors in turmas RLS policies
-- Date: 2025-12-13
-- ============================================

-- STEP 1: Remove all existing turmas policies
DROP POLICY IF EXISTS "turmas_select_policy" ON turmas;
DROP POLICY IF EXISTS "turmas_insert_policy" ON turmas;
DROP POLICY IF EXISTS "turmas_update_policy" ON turmas;
DROP POLICY IF EXISTS "turmas_delete_policy" ON turmas;
DROP POLICY IF EXISTS "Escola pode ver suas turmas" ON turmas;
DROP POLICY IF EXISTS "Escola pode criar turmas" ON turmas;
DROP POLICY IF EXISTS "Escola pode atualizar suas turmas" ON turmas;
DROP POLICY IF EXISTS "Escola pode deletar suas turmas" ON turmas;
DROP POLICY IF EXISTS "Professor pode ver turmas associadas" ON turmas;
DROP POLICY IF EXISTS "Users can view turmas" ON turmas;

-- STEP 2: Create simple policies WITHOUT complex JOINs to avoid recursion
-- SELECT: Allow access based on escola_id in user_profiles
CREATE POLICY "turmas_select_simple"
    ON turmas FOR SELECT
    USING (
        -- Check if the turma's escola_id matches the user's escola_id in user_profiles
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
              AND escola_id = turmas.escola_id 
              AND ativo = true
        )
    );

-- INSERT: Allow escola users to create turmas
CREATE POLICY "turmas_insert_simple"
    ON turmas FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
              AND escola_id = turmas.escola_id 
              AND tipo_perfil = 'ESCOLA'
              AND ativo = true
        )
    );

-- UPDATE: Allow users to update turmas from their escola
CREATE POLICY "turmas_update_simple"
    ON turmas FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
              AND escola_id = turmas.escola_id 
              AND ativo = true
        )
    );

-- DELETE: Allow escola users to delete turmas
CREATE POLICY "turmas_delete_simple"
    ON turmas FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
              AND escola_id = turmas.escola_id 
              AND tipo_perfil = 'ESCOLA'
              AND ativo = true
        )
    );

-- STEP 3: Ensure RLS is enabled
ALTER TABLE turmas ENABLE ROW LEVEL SECURITY;

-- STEP 4: Verify policies were created
SELECT 
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'turmas'
ORDER BY cmd, policyname;

-- ============================================
-- NOTES:
-- - These policies avoid infinite recursion by NOT using complex JOINs
-- - They use EXISTS instead of IN for better performance
-- - They query only user_profiles table (no joins with turma_professores or professores)
-- - They compare turmas.escola_id directly with user_profiles.escola_id
-- ============================================
