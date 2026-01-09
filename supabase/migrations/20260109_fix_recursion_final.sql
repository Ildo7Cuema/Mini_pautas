-- Migration: Final Fix for RLS Recursion using role_cache
-- Date: 2026-01-09
-- Description: Completely replaces reliance on recursive user_profiles queries with a dedicated, non-RLS role_cache table.

-- ==============================================================================
-- STEP 1: Setup role_cache table (Identity Cache)
-- ==============================================================================

-- Create the cache table if it doesn't exist
CREATE TABLE IF NOT EXISTS role_cache (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_superadmin BOOLEAN DEFAULT false,
    is_direcao_municipal BOOLEAN DEFAULT false,
    is_direcao_provincial BOOLEAN DEFAULT false,
    is_escola BOOLEAN DEFAULT false,
    escola_id UUID,
    municipio TEXT,
    provincia TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CRITICAL: Disable RLS on the cache table so it's always accessible to authenticated users
-- This breaks the recursion cycle.
ALTER TABLE role_cache DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON role_cache TO authenticated;

-- ==============================================================================
-- STEP 2: Sync Mechanism (Triggers)
-- ==============================================================================

-- Function to keep cache in sync with user_profiles
CREATE OR REPLACE FUNCTION sync_role_cache_from_profile()
RETURNS TRIGGER AS $$
DECLARE
    v_municipio TEXT;
    v_provincia TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM role_cache WHERE user_id = OLD.user_id;
        RETURN OLD;
    END IF;

    -- Fetch location data directly from source tables (Safe: these tables don't usually depend on user_profiles RLS for this specific query, 
    -- or we are inside a simplified context)
    -- We use separate queries to avoid complex joins that might trigger other RLS
    
    -- Check Municipality
    SELECT municipio INTO v_municipio FROM direcoes_municipais WHERE user_id = NEW.user_id;
    
    -- Check Province
    SELECT provincia INTO v_provincia FROM direcoes_provinciais WHERE user_id = NEW.user_id;

    -- Insert or Update cache
    INSERT INTO role_cache (
        user_id, 
        is_superadmin, 
        is_direcao_municipal, 
        is_direcao_provincial,
        is_escola, 
        escola_id, 
        municipio, 
        provincia,
        updated_at
    )
    VALUES (
        NEW.user_id,
        NEW.tipo_perfil = 'SUPERADMIN' AND NEW.ativo,
        NEW.tipo_perfil = 'DIRECAO_MUNICIPAL' AND NEW.ativo,
        NEW.tipo_perfil = 'DIRECAO_PROVINCIAL' AND NEW.ativo,
        NEW.tipo_perfil = 'ESCOLA' AND NEW.ativo,
        NEW.escola_id,
        v_municipio,
        v_provincia,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        is_superadmin = EXCLUDED.is_superadmin,
        is_direcao_municipal = EXCLUDED.is_direcao_municipal,
        is_direcao_provincial = EXCLUDED.is_direcao_provincial,
        is_escola = EXCLUDED.is_escola,
        escola_id = EXCLUDED.escola_id,
        municipio = EXCLUDED.municipio,
        provincia = EXCLUDED.provincia,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply trigger to user_profiles
DROP TRIGGER IF EXISTS trigger_sync_role_cache ON user_profiles;
CREATE TRIGGER trigger_sync_role_cache
    AFTER INSERT OR UPDATE OR DELETE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_role_cache_from_profile();

-- Force initial population of the cache
INSERT INTO role_cache (user_id, is_superadmin, is_direcao_municipal, is_direcao_provincial, is_escola, escola_id, municipio, provincia, updated_at)
SELECT 
    up.user_id,
    up.tipo_perfil = 'SUPERADMIN' AND up.ativo,
    up.tipo_perfil = 'DIRECAO_MUNICIPAL' AND up.ativo,
    up.tipo_perfil = 'DIRECAO_PROVINCIAL' AND up.ativo,
    up.tipo_perfil = 'ESCOLA' AND up.ativo,
    up.escola_id,
    dm.municipio,
    dp.provincia,
    NOW()
FROM user_profiles up
LEFT JOIN direcoes_municipais dm ON up.user_id = dm.user_id
LEFT JOIN direcoes_provinciais dp ON up.user_id = dp.user_id
ON CONFLICT (user_id) DO UPDATE SET
    is_superadmin = EXCLUDED.is_superadmin,
    is_direcao_municipal = EXCLUDED.is_direcao_municipal,
    is_direcao_provincial = EXCLUDED.is_direcao_provincial,
    is_escola = EXCLUDED.is_escola,
    escola_id = EXCLUDED.escola_id,
    municipio = EXCLUDED.municipio,
    provincia = EXCLUDED.provincia,
    updated_at = NOW();

-- ==============================================================================
-- STEP 3: Cached Helper Functions (Safe from recursion)
-- ==============================================================================

CREATE OR REPLACE FUNCTION is_superadmin_cached()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE((SELECT is_superadmin FROM role_cache WHERE user_id = auth.uid()), false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_direcao_municipal_cached()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE((SELECT is_direcao_municipal FROM role_cache WHERE user_id = auth.uid()), false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_direcao_provincial_cached()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE((SELECT is_direcao_provincial FROM role_cache WHERE user_id = auth.uid()), false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_direcao_provincia_cached()
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT provincia FROM role_cache WHERE user_id = auth.uid() AND is_direcao_provincial = true);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_direcao_municipio_cached()
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT municipio FROM role_cache WHERE user_id = auth.uid() AND is_direcao_municipal = true);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Override the original functions to redirect to cache (Safety net for other tables)
CREATE OR REPLACE FUNCTION is_superadmin() RETURNS BOOLEAN AS $$ BEGIN RETURN is_superadmin_cached(); END; $$ LANGUAGE plpgsql STABLE;
CREATE OR REPLACE FUNCTION is_direcao_municipal() RETURNS BOOLEAN AS $$ BEGIN RETURN is_direcao_municipal_cached(); END; $$ LANGUAGE plpgsql STABLE;
CREATE OR REPLACE FUNCTION is_direcao_provincial() RETURNS BOOLEAN AS $$ BEGIN RETURN is_direcao_provincial_cached(); END; $$ LANGUAGE plpgsql STABLE;
CREATE OR REPLACE FUNCTION get_direcao_provincia() RETURNS TEXT AS $$ BEGIN RETURN get_direcao_provincia_cached(); END; $$ LANGUAGE plpgsql STABLE;

-- ==============================================================================
-- STEP 4: Rewrite user_profiles Policies (The Core Fix)
-- ==============================================================================

-- Drop ALL existing policies to ensure a clean slate
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "SUPERADMIN can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "SUPERADMIN can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "SUPERADMIN can delete all profiles" ON user_profiles;
DROP POLICY IF EXISTS "SUPERADMIN can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Direcao Municipal can view user_profiles in municipio" ON user_profiles;
DROP POLICY IF EXISTS "Direcao Municipal can view profiles in municipio" ON user_profiles;
DROP POLICY IF EXISTS "Direcao Provincial can view user_profiles in provincia" ON user_profiles;
DROP POLICY IF EXISTS "Direcao Provincial can view profiles in provincia" ON user_profiles;
DROP POLICY IF EXISTS "Escola sees own profile and profiles in same school" ON user_profiles;
DROP POLICY IF EXISTS "Escolas can view profiles in own school" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_policy" ON user_profiles;
-- (Add any other known policy names here to be safe)

-- Re-create Policies using ONLY Cached Functions
-- 1. Self View
CREATE POLICY "Users can view own profile"
    ON user_profiles FOR SELECT
    USING (user_id = auth.uid());

-- 2. Superadmin View All
CREATE POLICY "SUPERADMIN can view all profiles"
    ON user_profiles FOR SELECT
    USING (is_superadmin_cached());

-- 3. Superadmin Manage All
CREATE POLICY "SUPERADMIN can manage all profiles"
    ON user_profiles FOR ALL
    USING (is_superadmin_cached());

-- 4. Direcao Municipal View (Restricted to same Municipality)
CREATE POLICY "Direcao Municipal can view profiles in municipio"
    ON user_profiles FOR SELECT
    USING (
        is_direcao_municipal_cached() AND (
            -- Either it's their own profile (covered by first policy, but good for completeness)
            user_id = auth.uid() 
            OR
            -- Or profile belongs to a school in their municipality
            escola_id IN (
                SELECT id FROM escolas WHERE municipio = get_direcao_municipio_cached()
            )
        )
    );

-- 5. Direcao Provincial View (Restricted to same Province)
CREATE POLICY "Direcao Provincial can view profiles in provincia"
    ON user_profiles FOR SELECT
    USING (
        is_direcao_provincial_cached() AND (
            user_id = auth.uid()
            OR
            escola_id IN (
                SELECT id FROM escolas WHERE provincia = get_direcao_provincia_cached()
            )
        )
    );

-- 6. Escolas View (Restricted to same School)
CREATE POLICY "Escolas can view profiles in own school"
    ON user_profiles FOR SELECT
    USING (
        -- If current user is an Escola (or staff)
        (
            -- Check if user is linked to an escola (cached check would be better but simple escola_id match is okay if not recursive)
            -- To be safe, let's use the simplest checks.
            -- If the user HAS an escola_id in their own profile (which they are reading right now? No. )
            -- We can't query user_profiles here for the current user safely without cache in some complex scenarios.
            -- But "auth.uid()" is safe.
            
            -- FIX: Use the CACHED escola_id for the current user to filter targets
            (SELECT escola_id FROM role_cache WHERE user_id = auth.uid()) IS NOT NULL
        )
        AND
        (
            -- The target profile belongs to the same school
            escola_id = (SELECT escola_id FROM role_cache WHERE user_id = auth.uid())
        )
    );

-- ==============================================================================
-- STEP 5: Cleanup & Verification
-- ==============================================================================

-- Ensure role_cache is publicly readable by authenticated users (again, to be sure)
GRANT SELECT ON role_cache TO authenticated;
