-- ============================================
-- Fix RLS policies for circulares_provinciais INSERT
-- This migration fixes the INSERT policy to properly allow
-- Direção Provincial to create circulars
-- ============================================

-- First, drop the existing problematic policy
DROP POLICY IF EXISTS "Direcao Provincial can manage circulares in provincia" ON circulares_provinciais;

-- Create separate policies for SELECT, INSERT, UPDATE, DELETE
-- This is more explicit and easier to debug

-- SELECT policy for Direção Provincial
CREATE POLICY "rls_circulares_provinciais_select"
    ON circulares_provinciais FOR SELECT
    USING (
        -- SUPERADMIN can see all
        is_superadmin()
        OR
        -- Direção Provincial can see their own province's circulars
        (
            is_direcao_provincial() AND 
            provincia = get_direcao_provincia()
        )
        OR
        -- Published circulars visible to municipal directorates
        (
            publicado = true AND 
            EXISTS (
                SELECT 1 FROM direcoes_municipais dm 
                WHERE dm.user_id = auth.uid() 
                AND dm.provincia = circulares_provinciais.provincia
                AND dm.ativo = true
            )
        )
    );

-- INSERT policy for Direção Provincial - simpler check
CREATE POLICY "rls_circulares_provinciais_insert"
    ON circulares_provinciais FOR INSERT
    WITH CHECK (
        -- SUPERADMIN can insert
        is_superadmin()
        OR
        -- Direção Provincial can insert for their province
        (
            is_direcao_provincial() AND 
            provincia = get_direcao_provincia()
        )
        OR
        -- Fallback: check directly against direcoes_provinciais table
        (
            EXISTS (
                SELECT 1 FROM direcoes_provinciais dp
                WHERE dp.user_id = auth.uid()
                AND dp.ativo = true
                AND dp.provincia = circulares_provinciais.provincia
            )
        )
    );

-- UPDATE policy for Direção Provincial
CREATE POLICY "rls_circulares_provinciais_update"
    ON circulares_provinciais FOR UPDATE
    USING (
        is_superadmin()
        OR
        (is_direcao_provincial() AND provincia = get_direcao_provincia())
        OR
        EXISTS (
            SELECT 1 FROM direcoes_provinciais dp
            WHERE dp.user_id = auth.uid()
            AND dp.ativo = true
            AND dp.provincia = circulares_provinciais.provincia
        )
    )
    WITH CHECK (
        is_superadmin()
        OR
        (is_direcao_provincial() AND provincia = get_direcao_provincia())
        OR
        EXISTS (
            SELECT 1 FROM direcoes_provinciais dp
            WHERE dp.user_id = auth.uid()
            AND dp.ativo = true
            AND dp.provincia = circulares_provinciais.provincia
        )
    );

-- DELETE policy for Direção Provincial
CREATE POLICY "rls_circulares_provinciais_delete"
    ON circulares_provinciais FOR DELETE
    USING (
        is_superadmin()
        OR
        (is_direcao_provincial() AND provincia = get_direcao_provincia())
        OR
        (
            created_by = auth.uid() AND
            EXISTS (
                SELECT 1 FROM direcoes_provinciais dp
                WHERE dp.user_id = auth.uid()
                AND dp.ativo = true
            )
        )
    );

-- Drop the old SUPERADMIN policy if separate (we included it above)
DROP POLICY IF EXISTS "SUPERADMIN can manage all circulares_provinciais" ON circulares_provinciais;

-- Drop the old municipal and school view policies (we included them in SELECT)
DROP POLICY IF EXISTS "Direcao Municipal can view circulares provinciais" ON circulares_provinciais;
DROP POLICY IF EXISTS "Escolas can view circulares provinciais" ON circulares_provinciais;

-- Verify role_cache is updated for the current user
DO $$
DECLARE
    v_user_id UUID;
    v_provincia TEXT;
BEGIN
    -- Update role_cache for all active provincial directors
    FOR v_user_id, v_provincia IN 
        SELECT dp.user_id, dp.provincia 
        FROM direcoes_provinciais dp 
        WHERE dp.ativo = true AND dp.user_id IS NOT NULL
    LOOP
        INSERT INTO role_cache (user_id, is_direcao_provincial, provincia, updated_at)
        VALUES (v_user_id, true, v_provincia, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            is_direcao_provincial = true,
            provincia = v_provincia,
            updated_at = NOW();
    END LOOP;
END $$;

-- Grant necessary permissions
GRANT ALL ON circulares_provinciais TO authenticated;
