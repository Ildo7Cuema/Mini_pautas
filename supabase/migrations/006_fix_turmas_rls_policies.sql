-- ============================================
-- CONSOLIDATED MIGRATION: Fix Turmas RLS Policies
-- Purpose: Fix permission errors when escola users try to access turmas
-- Issue: Old policies from migration 003 are still active and don't work with new user_profiles structure
-- ============================================

-- STEP 1: Drop old turmas policies
DROP POLICY IF EXISTS "Escola pode ver suas turmas" ON turmas;
DROP POLICY IF EXISTS "Escola pode criar turmas" ON turmas;
DROP POLICY IF EXISTS "Escola pode atualizar suas turmas" ON turmas;
DROP POLICY IF EXISTS "Escola pode deletar suas turmas" ON turmas;
DROP POLICY IF EXISTS "Professor pode ver turmas associadas" ON turmas;

-- STEP 2: Ensure get_current_user_escola_id() function exists
CREATE OR REPLACE FUNCTION get_current_user_escola_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    escola_uuid UUID;
BEGIN
    SELECT escola_id INTO escola_uuid
    FROM user_profiles
    WHERE user_id = auth.uid() AND ativo = true
    LIMIT 1;
    RETURN escola_uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION get_current_user_escola_id() TO authenticated;

-- STEP 3: Create new turmas policies using the helper function
CREATE POLICY "Escola pode ver suas turmas"
    ON turmas FOR SELECT
    USING (escola_id = get_current_user_escola_id());

CREATE POLICY "Escola pode criar turmas"
    ON turmas FOR INSERT
    WITH CHECK (escola_id = get_current_user_escola_id());

CREATE POLICY "Escola pode atualizar suas turmas"
    ON turmas FOR UPDATE
    USING (escola_id = get_current_user_escola_id());

CREATE POLICY "Escola pode deletar suas turmas"
    ON turmas FOR DELETE
    USING (escola_id = get_current_user_escola_id());

CREATE POLICY "Professor pode ver turmas associadas"
    ON turmas FOR SELECT
    USING (
        id IN (
            SELECT tp.turma_id 
            FROM turma_professores tp
            JOIN professores p ON p.id = tp.professor_id
            WHERE p.user_id = auth.uid()
        )
    );

-- STEP 4: Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'turmas'
ORDER BY policyname;
