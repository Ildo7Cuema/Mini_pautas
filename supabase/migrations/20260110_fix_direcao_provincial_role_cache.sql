-- ============================================
-- MIGRATION: Fix Direção Provincial role_cache and Province Access
-- Purpose: Ensure role_cache has correct provincia for Direção Provincial users
--          and policies allow viewing direcoes_municipais
-- Date: 2026-01-10
-- Issue: Direção Provincial cannot see Direções Municipais in dashboard
-- ============================================

-- Step 1: Force refresh of role_cache for all Direcao Provincial users
-- This ensures provincia is correctly populated from direcoes_provinciais table
UPDATE role_cache rc
SET 
    provincia = dp.provincia,
    is_direcao_provincial = true,
    updated_at = NOW()
FROM direcoes_provinciais dp
WHERE rc.user_id = dp.user_id
  AND dp.ativo = true;

-- Also populate from profiles that are DIRECAO_PROVINCIAL but may not be in cache
INSERT INTO role_cache (
    user_id, tipo_perfil, is_superadmin, is_direcao_municipal, is_direcao_provincial, 
    is_escola, escola_id, municipio, provincia, ativo, updated_at
)
SELECT 
    up.user_id,
    up.tipo_perfil,
    up.tipo_perfil = 'SUPERADMIN' AND up.ativo,
    up.tipo_perfil = 'DIRECAO_MUNICIPAL' AND up.ativo,
    up.tipo_perfil = 'DIRECAO_PROVINCIAL' AND up.ativo,
    up.tipo_perfil = 'ESCOLA' AND up.ativo,
    up.escola_id,
    dm.municipio,
    COALESCE(dp.provincia, e.provincia),
    up.ativo,
    NOW()
FROM user_profiles up
LEFT JOIN direcoes_municipais dm ON up.user_id = dm.user_id
LEFT JOIN direcoes_provinciais dp ON up.user_id = dp.user_id
LEFT JOIN escolas e ON up.escola_id = e.id
WHERE up.tipo_perfil = 'DIRECAO_PROVINCIAL'
ON CONFLICT (user_id) DO UPDATE SET
    tipo_perfil = EXCLUDED.tipo_perfil,
    is_superadmin = EXCLUDED.is_superadmin,
    is_direcao_municipal = EXCLUDED.is_direcao_municipal,
    is_direcao_provincial = EXCLUDED.is_direcao_provincial,
    is_escola = EXCLUDED.is_escola,
    escola_id = EXCLUDED.escola_id,
    municipio = EXCLUDED.municipio,
    provincia = EXCLUDED.provincia,
    ativo = EXCLUDED.ativo,
    updated_at = NOW();

-- Step 2: Recreate the get_direcao_provincia() function with better error handling
CREATE OR REPLACE FUNCTION get_direcao_provincia()
RETURNS TEXT AS $$
DECLARE
    result_provincia TEXT;
BEGIN
    -- First try from role_cache
    SELECT provincia INTO result_provincia 
    FROM role_cache 
    WHERE user_id = auth.uid() 
      AND is_direcao_provincial = true
      AND provincia IS NOT NULL;
    
    -- If not found in cache, try directly from direcoes_provinciais
    IF result_provincia IS NULL THEN
        SELECT dp.provincia INTO result_provincia
        FROM direcoes_provinciais dp
        WHERE dp.user_id = auth.uid()
          AND dp.ativo = true;
          
        -- Update cache if we found it
        IF result_provincia IS NOT NULL THEN
            UPDATE role_cache 
            SET provincia = result_provincia, 
                is_direcao_provincial = true,
                updated_at = NOW()
            WHERE user_id = auth.uid();
        END IF;
    END IF;
    
    RETURN result_provincia;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Step 3: Recreate is_direcao_provincial() with fallback
CREATE OR REPLACE FUNCTION is_direcao_provincial()
RETURNS BOOLEAN AS $$
DECLARE
    cached_result BOOLEAN;
BEGIN
    -- Try from cache first
    SELECT is_direcao_provincial INTO cached_result 
    FROM role_cache 
    WHERE user_id = auth.uid();
    
    IF cached_result IS NOT NULL THEN
        RETURN cached_result;
    END IF;
    
    -- Fallback: check user_profiles directly (SECURITY DEFINER bypasses RLS)
    RETURN EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND tipo_perfil = 'DIRECAO_PROVINCIAL' 
        AND ativo = true
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Step 4: Ensure direcoes_municipais RLS policies exist and are correct
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Direcao Provincial can view direcoes_municipais in provincia" ON direcoes_municipais;
DROP POLICY IF EXISTS "direcao_provincial_view_municipais" ON direcoes_municipais;
DROP POLICY IF EXISTS "rls_direcoes_municipais_provincial_view" ON direcoes_municipais;

-- Create new policy for Direcao Provincial to see direcoes_municipais
CREATE POLICY "rls_direcoes_municipais_provincial_view"
    ON direcoes_municipais FOR SELECT
    USING (
        is_direcao_provincial() = true
        AND provincia = get_direcao_provincia()
    );

-- Step 5: Also ensure the update policy exists
DROP POLICY IF EXISTS "Direcao Provincial can update direcoes_municipais in provincia" ON direcoes_municipais;
DROP POLICY IF EXISTS "rls_direcoes_municipais_provincial_update" ON direcoes_municipais;

CREATE POLICY "rls_direcoes_municipais_provincial_update"
    ON direcoes_municipais FOR UPDATE
    USING (
        is_direcao_provincial() = true
        AND provincia = get_direcao_provincia()
    );

-- Step 6: Grant permissions on functions
GRANT EXECUTE ON FUNCTION get_direcao_provincia() TO authenticated;
GRANT EXECUTE ON FUNCTION is_direcao_provincial() TO authenticated;

-- Step 7: Create a trigger on direcoes_provinciais to sync role_cache
CREATE OR REPLACE FUNCTION sync_direcao_provincial_role_cache()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        -- Remove provincial role from cache
        UPDATE role_cache 
        SET is_direcao_provincial = false, provincia = NULL, updated_at = NOW()
        WHERE user_id = OLD.user_id;
        RETURN OLD;
    END IF;

    -- Update or insert into role_cache
    INSERT INTO role_cache (
        user_id, tipo_perfil, is_direcao_provincial, provincia, ativo, updated_at
    ) VALUES (
        NEW.user_id,
        'DIRECAO_PROVINCIAL',
        NEW.ativo,
        NEW.provincia,
        NEW.ativo,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        is_direcao_provincial = NEW.ativo,
        provincia = NEW.provincia,
        ativo = COALESCE(role_cache.ativo, NEW.ativo),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_direcao_provincial_role_cache ON direcoes_provinciais;
CREATE TRIGGER trigger_sync_direcao_provincial_role_cache
    AFTER INSERT OR UPDATE OR DELETE ON direcoes_provinciais
    FOR EACH ROW
    EXECUTE FUNCTION sync_direcao_provincial_role_cache();

-- ============================================
-- DIAGNOSTIC: Show current state
-- ============================================
DO $$
DECLARE
    provincial_count INTEGER;
    cached_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO provincial_count FROM direcoes_provinciais WHERE ativo = true;
    SELECT COUNT(*) INTO cached_count FROM role_cache WHERE is_direcao_provincial = true AND provincia IS NOT NULL;
    
    RAISE NOTICE 'Active Direcoes Provinciais: %, Cached with provincia: %', provincial_count, cached_count;
END $$;

-- ============================================
-- END OF MIGRATION
-- ============================================
