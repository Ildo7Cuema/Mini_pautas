-- Migration: NUCLEAR Fix for RLS Recursion
-- Date: 2026-01-09
-- Description: Drops ALL policies on user_profiles and creates minimal safe ones using role_cache

-- ==============================================================================
-- STEP 1: Ensure role_cache exists and has no RLS
-- ==============================================================================

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

ALTER TABLE role_cache DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON role_cache TO authenticated;

-- ==============================================================================
-- STEP 2: Populate role_cache from existing data
-- ==============================================================================

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
-- STEP 3: Create/Update cached helper functions
-- ==============================================================================

CREATE OR REPLACE FUNCTION is_superadmin_cached() RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE((SELECT is_superadmin FROM role_cache WHERE user_id = auth.uid()), false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_direcao_municipal_cached() RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE((SELECT is_direcao_municipal FROM role_cache WHERE user_id = auth.uid()), false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_direcao_provincial_cached() RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE((SELECT is_direcao_provincial FROM role_cache WHERE user_id = auth.uid()), false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_cached_escola_id() RETURNS UUID AS $$
BEGIN
    RETURN (SELECT escola_id FROM role_cache WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_cached_municipio() RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT municipio FROM role_cache WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_cached_provincia() RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT provincia FROM role_cache WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Override dangerous functions to use cache
CREATE OR REPLACE FUNCTION is_superadmin() RETURNS BOOLEAN AS $$ BEGIN RETURN is_superadmin_cached(); END; $$ LANGUAGE plpgsql STABLE;
CREATE OR REPLACE FUNCTION is_direcao_municipal() RETURNS BOOLEAN AS $$ BEGIN RETURN is_direcao_municipal_cached(); END; $$ LANGUAGE plpgsql STABLE;
CREATE OR REPLACE FUNCTION is_direcao_provincial() RETURNS BOOLEAN AS $$ BEGIN RETURN is_direcao_provincial_cached(); END; $$ LANGUAGE plpgsql STABLE;
CREATE OR REPLACE FUNCTION get_current_user_escola_id() RETURNS UUID AS $$ BEGIN RETURN get_cached_escola_id(); END; $$ LANGUAGE plpgsql STABLE;

-- ==============================================================================
-- STEP 4: DROP ALL POLICIES on user_profiles (Dynamic)
-- ==============================================================================

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_profiles', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- ==============================================================================
-- STEP 5: Create MINIMAL safe policies (NO subqueries on other tables!)
-- ==============================================================================

-- Policy 1: Users can ALWAYS view their OWN profile
CREATE POLICY "user_profiles_select_own"
    ON user_profiles FOR SELECT
    USING (user_id = auth.uid());

-- Policy 2: SUPERADMIN can do everything (using cached check)
CREATE POLICY "user_profiles_superadmin_all"
    ON user_profiles FOR ALL
    USING (is_superadmin_cached());

-- Policy 3: Users with escola_id can view profiles in same escola (using cache for CURRENT user's escola)
CREATE POLICY "user_profiles_same_escola_select"
    ON user_profiles FOR SELECT
    USING (
        escola_id IS NOT NULL 
        AND escola_id = get_cached_escola_id()
    );

-- Policy 4: Direcao Municipal can view profiles in their municipio
-- SAFE: Uses cached municipio, matches against escola's municipio via a join-free check
CREATE POLICY "user_profiles_direcao_municipal_select"
    ON user_profiles FOR SELECT
    USING (
        is_direcao_municipal_cached() 
        AND escola_id IN (
            SELECT id FROM escolas WHERE municipio = get_cached_municipio()
        )
    );

-- Policy 5: Direcao Provincial can view profiles in their provincia
CREATE POLICY "user_profiles_direcao_provincial_select"
    ON user_profiles FOR SELECT
    USING (
        is_direcao_provincial_cached() 
        AND escola_id IN (
            SELECT id FROM escolas WHERE provincia = get_cached_provincia()
        )
    );

-- ==============================================================================
-- STEP 6: Sync trigger for role_cache
-- ==============================================================================

CREATE OR REPLACE FUNCTION sync_role_cache_on_profile_change()
RETURNS TRIGGER AS $$
DECLARE
    v_municipio TEXT;
    v_provincia TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM role_cache WHERE user_id = OLD.user_id;
        RETURN OLD;
    END IF;

    SELECT municipio INTO v_municipio FROM direcoes_municipais WHERE user_id = NEW.user_id;
    SELECT provincia INTO v_provincia FROM direcoes_provinciais WHERE user_id = NEW.user_id;

    INSERT INTO role_cache (user_id, is_superadmin, is_direcao_municipal, is_direcao_provincial, is_escola, escola_id, municipio, provincia, updated_at)
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

DROP TRIGGER IF EXISTS trigger_sync_role_cache ON user_profiles;
CREATE TRIGGER trigger_sync_role_cache
    AFTER INSERT OR UPDATE OR DELETE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_role_cache_on_profile_change();

-- ==============================================================================
-- END
-- ==============================================================================
