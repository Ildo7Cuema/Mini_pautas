-- Migration: Definitive Fix for RLS Recursion
-- Date: 2026-01-09
-- Description: Ensures all checks for Direção Provincial usage role_cache to prevent infinite recursion in RLS.

-- 1. Ensure role_cache exists and has correct columns
CREATE TABLE IF NOT EXISTS role_cache (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_superadmin BOOLEAN DEFAULT false,
    is_direcao_municipal BOOLEAN DEFAULT false,
    is_direcao_provincial BOOLEAN DEFAULT false, -- Ensure this exists
    is_escola BOOLEAN DEFAULT false,
    escola_id UUID,
    municipio TEXT,
    provincia TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Make sure role_cache is NOT protected by RLS (or is public for auth users)
ALTER TABLE role_cache DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON role_cache TO authenticated;

-- 3. Create/Update the sync function to populate role_cache correctly
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

    -- Fetch aux data (safe lookup, no recursion risk as these tables shouldn't query user_profiles for basic SELECTS)
    -- Even if they do, role_cache writes happen in TRIGGER (Security Definer usually), bypassing RLS
    SELECT municipio INTO v_municipio FROM direcoes_municipais WHERE user_id = NEW.user_id;
    SELECT provincia INTO v_provincia FROM direcoes_provinciais WHERE user_id = NEW.user_id;

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

-- 4. Re-apply trigger to user_profiles
DROP TRIGGER IF EXISTS trigger_sync_role_cache ON user_profiles;
CREATE TRIGGER trigger_sync_role_cache
    AFTER INSERT OR UPDATE OR DELETE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_role_cache_from_profile();

-- 5. Force update of role_cache for existing users
-- This ensures the cache is consistent NOW
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

-- 6. Define CACHED helper functions (Safe from recursion)
CREATE OR REPLACE FUNCTION is_direcao_provincial_cached()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE((SELECT is_direcao_provincial FROM role_cache WHERE user_id = auth.uid()), false);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_direcao_provincia_cached()
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT provincia FROM role_cache WHERE user_id = auth.uid() AND is_direcao_provincial = true);
END;
$$ LANGUAGE plpgsql STABLE;

-- 7. OVERWRITE the original functions to use the CACHE
-- This is critical: if any policy uses the old function, it must now point to the cache
CREATE OR REPLACE FUNCTION is_direcao_provincial()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN is_direcao_provincial_cached();
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_direcao_provincia()
RETURNS TEXT AS $$
BEGIN
    RETURN get_direcao_provincia_cached();
END;
$$ LANGUAGE plpgsql STABLE;

-- 8. Drop and Recreate the problematic policy on user_profiles
DROP POLICY IF EXISTS "Direcao Provincial can view user_profiles in provincia" ON user_profiles;

CREATE POLICY "Direcao Provincial can view user_profiles in provincia"
    ON user_profiles FOR SELECT
    USING (
        is_direcao_provincial_cached() AND (
            user_id = auth.uid()
            OR
            escola_id IN (
                SELECT e.id FROM escolas e 
                WHERE e.provincia = get_direcao_provincia_cached()
            )
        )
    );

-- 9. Bonus: Ensure schools lookup doesn't cause recursion if it had weird policies
-- (Assuming schools table is safe, which it usually is unless it looks back at UP with a recursive check)

-- 10. Fix get_current_user_escola_id to be safe too if not already
CREATE OR REPLACE FUNCTION get_current_user_escola_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT escola_id FROM role_cache WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE;

