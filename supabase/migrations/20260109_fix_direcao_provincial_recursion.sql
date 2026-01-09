-- Migration: Fix Direção Provincial Recursion and Missing RPC
-- Date: 2026-01-09
-- Purpose: 
-- 1. Fix infinite recursion in user_profiles RLS by extending role_cache
-- 2. Restore missing register_direcao_provincial function

-- ============================================
-- 1. Extend role_cache to support Direção Provincial
-- ============================================

ALTER TABLE role_cache ADD COLUMN IF NOT EXISTS is_direcao_provincial BOOLEAN DEFAULT false;
ALTER TABLE role_cache ADD COLUMN IF NOT EXISTS provincia TEXT;
CREATE INDEX IF NOT EXISTS idx_role_cache_direcao_provincial ON role_cache(is_direcao_provincial) WHERE is_direcao_provincial = true;

-- ============================================
-- 2. Update Sync Function (to handle provincial data)
-- ============================================

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

    -- Fetch aux data
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
        is_superadmin = NEW.tipo_perfil = 'SUPERADMIN' AND NEW.ativo,
        is_direcao_municipal = NEW.tipo_perfil = 'DIRECAO_MUNICIPAL' AND NEW.ativo,
        is_direcao_provincial = NEW.tipo_perfil = 'DIRECAO_PROVINCIAL' AND NEW.ativo,
        is_escola = NEW.tipo_perfil = 'ESCOLA' AND NEW.ativo,
        escola_id = NEW.escola_id,
        municipio = v_municipio,
        provincia = v_provincia,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on direcoes_provinciais to keep cache fresh
CREATE OR REPLACE FUNCTION sync_role_cache_from_direcao_provincial()
RETURNS TRIGGER AS $$
BEGIN
    -- Update role_cache for this user
    UPDATE role_cache 
    SET provincia = NEW.provincia, updated_at = NOW()
    WHERE user_id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_role_cache_dp ON direcoes_provinciais;
CREATE TRIGGER trigger_sync_role_cache_dp
    AFTER INSERT OR UPDATE OF provincia, ativo ON direcoes_provinciais
    FOR EACH ROW
    EXECUTE FUNCTION sync_role_cache_from_direcao_provincial();

-- ============================================
-- 3. Backfill Cache
-- ============================================
UPDATE role_cache rc
SET 
    is_direcao_provincial = (up.tipo_perfil = 'DIRECAO_PROVINCIAL' AND up.ativo),
    provincia = dp.provincia
FROM user_profiles up
LEFT JOIN direcoes_provinciais dp ON up.user_id = dp.user_id
WHERE rc.user_id = up.user_id;

-- ============================================
-- 4. Safe Helper Functions
-- ============================================

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

--Recriar is_direcao_provincial para usar cache (para garantir que outras políticas usem a versão segura)
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

-- ============================================
-- 5. Fix Recursive Policy
-- ============================================
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

-- ============================================
-- 6. Restore Missing RPC Function
-- ============================================
CREATE OR REPLACE FUNCTION register_direcao_provincial(
    p_user_id UUID,
    p_nome TEXT,
    p_provincia TEXT,
    p_email TEXT,
    p_telefone TEXT DEFAULT NULL,
    p_cargo TEXT DEFAULT 'Director Provincial de Educação'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_profile_id UUID;
    v_existing_direcao_id UUID;
BEGIN
    -- Check profile
    SELECT id INTO v_existing_profile_id FROM user_profiles WHERE user_id = p_user_id;
    IF v_existing_profile_id IS NOT NULL THEN
        RAISE EXCEPTION 'Já existe um perfil para este utilizador';
    END IF;

    -- Check existing Direcao
    SELECT id INTO v_existing_direcao_id FROM direcoes_provinciais WHERE provincia = p_provincia AND ativo = true;
    IF v_existing_direcao_id IS NOT NULL THEN
        RAISE EXCEPTION 'Já existe uma Direção Provincial activa para %', p_provincia;
    END IF;
    
    -- Check email
    SELECT id INTO v_existing_direcao_id FROM direcoes_provinciais WHERE email = p_email;
    IF v_existing_direcao_id IS NOT NULL THEN
        RAISE EXCEPTION 'Este email já está associado a outra Direção Provincial';
    END IF;

    -- Create Profile (Inactive)
    INSERT INTO user_profiles (user_id, tipo_perfil, escola_id, ativo)
    VALUES (p_user_id, 'DIRECAO_PROVINCIAL', NULL, false);

    -- Create Direcao (Inactive)
    INSERT INTO direcoes_provinciais (user_id, nome, provincia, email, telefone, cargo, ativo)
    VALUES (p_user_id, p_nome, p_provincia, p_email, p_telefone, p_cargo, false);

    -- Notification
    INSERT INTO notificacoes (destinatario_id, tipo, titulo, mensagem, dados_adicionais)
    SELECT 
        up.user_id,
        'sistema',
        'Nova Direção Provincial Pendente',
        'Nova solicitação de registo de Direção Provincial de ' || p_provincia || ' aguarda aprovação.',
        jsonb_build_object('tipo', 'aprovacao_direcao_provincial', 'direcao_nome', p_nome, 'provincia', p_provincia)
    FROM user_profiles up
    WHERE up.tipo_perfil = 'SUPERADMIN' AND up.ativo = true;
END;
$$;

GRANT EXECUTE ON FUNCTION register_direcao_provincial(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, anon, service_role;

COMMENT ON FUNCTION register_direcao_provincial IS 'Restored RPC function for provincial directorate registration. Accessible to anon to handle registration flow race conditions.';
