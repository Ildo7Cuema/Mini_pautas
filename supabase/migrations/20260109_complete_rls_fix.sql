-- ============================================================================
-- MIGRATION: Complete RLS Recursion Fix (Professional Solution)
-- Date: 2026-01-09
-- Author: Automated Migration
-- 
-- ROOT CAUSE ANALYSIS:
-- The infinite recursion (42P17) occurs because:
-- 1. RLS policies on user_profiles call helper functions like is_direcao_municipal()
-- 2. These functions query user_profiles to check the user's role
-- 3. This triggers RLS again → infinite loop
--
-- SOLUTION:
-- 1. Create a role_cache table WITHOUT RLS
-- 2. Rewrite ALL helper functions to use role_cache instead of user_profiles
-- 3. Keep role_cache synchronized via SECURITY DEFINER triggers
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: Create/Update role_cache Table (No RLS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS role_cache (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tipo_perfil TEXT,
    is_superadmin BOOLEAN DEFAULT false,
    is_direcao_municipal BOOLEAN DEFAULT false,
    is_direcao_provincial BOOLEAN DEFAULT false,
    is_escola BOOLEAN DEFAULT false,
    is_professor BOOLEAN DEFAULT false,
    is_secretario BOOLEAN DEFAULT false,
    is_aluno BOOLEAN DEFAULT false,
    escola_id UUID,
    municipio TEXT,
    provincia TEXT,
    ativo BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to existing table (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'role_cache' AND column_name = 'tipo_perfil') THEN
        ALTER TABLE role_cache ADD COLUMN tipo_perfil TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'role_cache' AND column_name = 'is_professor') THEN
        ALTER TABLE role_cache ADD COLUMN is_professor BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'role_cache' AND column_name = 'is_secretario') THEN
        ALTER TABLE role_cache ADD COLUMN is_secretario BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'role_cache' AND column_name = 'is_aluno') THEN
        ALTER TABLE role_cache ADD COLUMN is_aluno BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'role_cache' AND column_name = 'ativo') THEN
        ALTER TABLE role_cache ADD COLUMN ativo BOOLEAN DEFAULT true;
    END IF;
END $$;

-- CRITICAL: Disable RLS completely on role_cache
ALTER TABLE role_cache DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON role_cache TO authenticated;
GRANT SELECT ON role_cache TO anon;

-- ============================================================================
-- PHASE 2: Populate role_cache with Current Data
-- ============================================================================

INSERT INTO role_cache (
    user_id, tipo_perfil, is_superadmin, is_direcao_municipal, is_direcao_provincial, 
    is_escola, is_professor, is_secretario, is_aluno, escola_id, municipio, provincia, ativo, updated_at
)
SELECT 
    up.user_id,
    up.tipo_perfil,
    up.tipo_perfil = 'SUPERADMIN' AND up.ativo,
    up.tipo_perfil = 'DIRECAO_MUNICIPAL' AND up.ativo,
    up.tipo_perfil = 'DIRECAO_PROVINCIAL' AND up.ativo,
    up.tipo_perfil = 'ESCOLA' AND up.ativo,
    up.tipo_perfil = 'PROFESSOR' AND up.ativo,
    up.tipo_perfil = 'SECRETARIO' AND up.ativo,
    up.tipo_perfil = 'ALUNO' AND up.ativo,
    up.escola_id,
    dm.municipio,
    dp.provincia,
    up.ativo,
    NOW()
FROM user_profiles up
LEFT JOIN direcoes_municipais dm ON up.user_id = dm.user_id
LEFT JOIN direcoes_provinciais dp ON up.user_id = dp.user_id
ON CONFLICT (user_id) DO UPDATE SET
    tipo_perfil = EXCLUDED.tipo_perfil,
    is_superadmin = EXCLUDED.is_superadmin,
    is_direcao_municipal = EXCLUDED.is_direcao_municipal,
    is_direcao_provincial = EXCLUDED.is_direcao_provincial,
    is_escola = EXCLUDED.is_escola,
    is_professor = EXCLUDED.is_professor,
    is_secretario = EXCLUDED.is_secretario,
    is_aluno = EXCLUDED.is_aluno,
    escola_id = EXCLUDED.escola_id,
    municipio = EXCLUDED.municipio,
    provincia = EXCLUDED.provincia,
    ativo = EXCLUDED.ativo,
    updated_at = NOW();

-- ============================================================================
-- PHASE 3: Create Safe Helper Functions (Query role_cache, NOT user_profiles)
-- ============================================================================

-- SUPERADMIN check
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE((SELECT is_superadmin FROM role_cache WHERE user_id = auth.uid()), false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- DIRECAO_MUNICIPAL check
CREATE OR REPLACE FUNCTION is_direcao_municipal()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE((SELECT is_direcao_municipal FROM role_cache WHERE user_id = auth.uid()), false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- DIRECAO_PROVINCIAL check
CREATE OR REPLACE FUNCTION is_direcao_provincial()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE((SELECT is_direcao_provincial FROM role_cache WHERE user_id = auth.uid()), false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get current user's escola_id
CREATE OR REPLACE FUNCTION get_current_user_escola_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT escola_id FROM role_cache WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get municipio for Direção Municipal
CREATE OR REPLACE FUNCTION get_direcao_municipio()
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT municipio FROM role_cache WHERE user_id = auth.uid() AND is_direcao_municipal = true);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get provincia for Direção Provincial
CREATE OR REPLACE FUNCTION get_direcao_provincia()
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT provincia FROM role_cache WHERE user_id = auth.uid() AND is_direcao_provincial = true);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Safe escola check for Direção Municipal
CREATE OR REPLACE FUNCTION escola_in_direcao_municipio(escola_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_municipio TEXT;
BEGIN
    SELECT municipio INTO user_municipio FROM role_cache WHERE user_id = auth.uid() AND is_direcao_municipal = true;
    
    IF user_municipio IS NULL THEN
        RETURN false;
    END IF;
    
    RETURN EXISTS (SELECT 1 FROM escolas e WHERE e.id = escola_uuid AND e.municipio = user_municipio);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Safe escola check for Direção Provincial
CREATE OR REPLACE FUNCTION escola_in_direcao_provincia(escola_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_provincia TEXT;
BEGIN
    SELECT provincia INTO user_provincia FROM role_cache WHERE user_id = auth.uid() AND is_direcao_provincial = true;
    
    IF user_provincia IS NULL THEN
        RETURN false;
    END IF;
    
    RETURN EXISTS (SELECT 1 FROM escolas e WHERE e.id = escola_uuid AND e.provincia = user_provincia);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- PHASE 4: Sync Trigger (Keep role_cache Updated)
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_role_cache()
RETURNS TRIGGER AS $$
DECLARE
    v_municipio TEXT;
    v_provincia TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM role_cache WHERE user_id = OLD.user_id;
        RETURN OLD;
    END IF;

    -- Get municipality/province if applicable
    SELECT municipio INTO v_municipio FROM direcoes_municipais WHERE user_id = NEW.user_id;
    SELECT provincia INTO v_provincia FROM direcoes_provinciais WHERE user_id = NEW.user_id;

    INSERT INTO role_cache (
        user_id, tipo_perfil, is_superadmin, is_direcao_municipal, is_direcao_provincial,
        is_escola, is_professor, is_secretario, is_aluno, escola_id, municipio, provincia, ativo, updated_at
    ) VALUES (
        NEW.user_id,
        NEW.tipo_perfil,
        NEW.tipo_perfil = 'SUPERADMIN' AND NEW.ativo,
        NEW.tipo_perfil = 'DIRECAO_MUNICIPAL' AND NEW.ativo,
        NEW.tipo_perfil = 'DIRECAO_PROVINCIAL' AND NEW.ativo,
        NEW.tipo_perfil = 'ESCOLA' AND NEW.ativo,
        NEW.tipo_perfil = 'PROFESSOR' AND NEW.ativo,
        NEW.tipo_perfil = 'SECRETARIO' AND NEW.ativo,
        NEW.tipo_perfil = 'ALUNO' AND NEW.ativo,
        NEW.escola_id,
        v_municipio,
        v_provincia,
        NEW.ativo,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        tipo_perfil = EXCLUDED.tipo_perfil,
        is_superadmin = EXCLUDED.is_superadmin,
        is_direcao_municipal = EXCLUDED.is_direcao_municipal,
        is_direcao_provincial = EXCLUDED.is_direcao_provincial,
        is_escola = EXCLUDED.is_escola,
        is_professor = EXCLUDED.is_professor,
        is_secretario = EXCLUDED.is_secretario,
        is_aluno = EXCLUDED.is_aluno,
        escola_id = EXCLUDED.escola_id,
        municipio = EXCLUDED.municipio,
        provincia = EXCLUDED.provincia,
        ativo = EXCLUDED.ativo,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_role_cache ON user_profiles;
CREATE TRIGGER trigger_sync_role_cache
    AFTER INSERT OR UPDATE OR DELETE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_role_cache();

-- ============================================================================
-- PHASE 5: Drop ALL Policies on user_profiles (Dynamic)
-- ============================================================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_profiles', pol.policyname);
    END LOOP;
END $$;

-- ============================================================================
-- PHASE 6: Recreate user_profiles Policies (Using ONLY role_cache)
-- ============================================================================

-- Policy 1: Users can always view their own profile
CREATE POLICY "rls_user_profiles_select_own"
    ON user_profiles FOR SELECT
    USING (user_id = auth.uid());

-- Policy 2: SUPERADMIN full access
CREATE POLICY "rls_user_profiles_superadmin"
    ON user_profiles FOR ALL
    USING ((SELECT is_superadmin FROM role_cache WHERE user_id = auth.uid()) = true);

-- Policy 3: Escola users can view profiles in same escola
CREATE POLICY "rls_user_profiles_escola"
    ON user_profiles FOR SELECT
    USING (
        escola_id IS NOT NULL
        AND escola_id = (SELECT escola_id FROM role_cache WHERE user_id = auth.uid())
    );

-- Policy 4: Direção Municipal can view profiles in their municipality
CREATE POLICY "rls_user_profiles_direcao_municipal"
    ON user_profiles FOR SELECT
    USING (
        (SELECT is_direcao_municipal FROM role_cache WHERE user_id = auth.uid()) = true
        AND (
            user_id = auth.uid()
            OR escola_id IN (
                SELECT id FROM escolas 
                WHERE municipio = (SELECT municipio FROM role_cache WHERE user_id = auth.uid())
            )
        )
    );

-- Policy 5: Direção Provincial can view profiles in their province
CREATE POLICY "rls_user_profiles_direcao_provincial"
    ON user_profiles FOR SELECT
    USING (
        (SELECT is_direcao_provincial FROM role_cache WHERE user_id = auth.uid()) = true
        AND (
            user_id = auth.uid()
            OR escola_id IN (
                SELECT id FROM escolas 
                WHERE provincia = (SELECT provincia FROM role_cache WHERE user_id = auth.uid())
            )
        )
    );

COMMIT;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
