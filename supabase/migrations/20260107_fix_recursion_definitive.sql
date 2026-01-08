-- ============================================
-- FIX DEFINITIVO: Resolver recursão usando tabelas auxiliares
-- 
-- O PROBLEMA: Qualquer função que consulta user_profiles dentro de uma
-- policy de user_profiles causa recursão infinita, MESMO com SECURITY DEFINER.
--
-- A SOLUÇÃO: Criar tabelas auxiliares SEM RLS para verificações de role,
-- e usar essas tabelas nas policies em vez de consultar user_profiles.
-- ============================================

-- ============================================
-- PARTE 1: Remover TODAS as policies problemáticas
-- ============================================

DO $$ 
BEGIN
    -- Remover todas as policies de user_profiles que possam causar recursão
    DROP POLICY IF EXISTS "SUPERADMIN can view all user_profiles" ON user_profiles;
    DROP POLICY IF EXISTS "SUPERADMIN can insert user_profiles" ON user_profiles;
    DROP POLICY IF EXISTS "SUPERADMIN can update all user_profiles" ON user_profiles;
    DROP POLICY IF EXISTS "SUPERADMIN can view all user_profiles safe" ON user_profiles;
    DROP POLICY IF EXISTS "SUPERADMIN can insert user_profiles safe" ON user_profiles;
    DROP POLICY IF EXISTS "SUPERADMIN can update all user_profiles safe" ON user_profiles;
    DROP POLICY IF EXISTS "Direcao Municipal can view user_profiles in municipio" ON user_profiles;
    DROP POLICY IF EXISTS "Direcao Municipal can view user_profiles in municipio v2" ON user_profiles;
    DROP POLICY IF EXISTS "Direcao Municipal can view user_profiles in municipio safe" ON user_profiles;
EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignorar erros se policies não existirem
END $$;

-- ============================================
-- PARTE 2: Criar tabela auxiliar para roles especiais (SEM RLS!)
-- Esta tabela é usada APENAS para verificações de policy
-- ============================================

CREATE TABLE IF NOT EXISTS role_cache (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_superadmin BOOLEAN DEFAULT false,
    is_direcao_municipal BOOLEAN DEFAULT false,
    municipio TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- IMPORTANTE: NÃO habilitar RLS nesta tabela!
-- Ela deve ser acessível para verificações de policy
ALTER TABLE role_cache DISABLE ROW LEVEL SECURITY;

-- Índices
CREATE INDEX IF NOT EXISTS idx_role_cache_superadmin ON role_cache(is_superadmin) WHERE is_superadmin = true;
CREATE INDEX IF NOT EXISTS idx_role_cache_direcao ON role_cache(is_direcao_municipal) WHERE is_direcao_municipal = true;

-- ============================================
-- PARTE 3: Triggers para manter role_cache sincronizada
-- ============================================

-- Trigger para sincronizar quando user_profiles muda
CREATE OR REPLACE FUNCTION sync_role_cache_from_profile()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM role_cache WHERE user_id = OLD.user_id;
        RETURN OLD;
    END IF;

    INSERT INTO role_cache (user_id, is_superadmin, is_direcao_municipal, updated_at)
    VALUES (
        NEW.user_id,
        NEW.tipo_perfil = 'SUPERADMIN' AND NEW.ativo,
        NEW.tipo_perfil = 'DIRECAO_MUNICIPAL' AND NEW.ativo,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        is_superadmin = NEW.tipo_perfil = 'SUPERADMIN' AND NEW.ativo,
        is_direcao_municipal = NEW.tipo_perfil = 'DIRECAO_MUNICIPAL' AND NEW.ativo,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_role_cache ON user_profiles;
CREATE TRIGGER trigger_sync_role_cache
    AFTER INSERT OR UPDATE OR DELETE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_role_cache_from_profile();

-- Trigger para sincronizar município da Direção Municipal
CREATE OR REPLACE FUNCTION sync_role_cache_municipio()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE role_cache SET municipio = NULL WHERE user_id = OLD.user_id;
        RETURN OLD;
    END IF;

    UPDATE role_cache 
    SET municipio = NEW.municipio, updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_role_cache_municipio ON direcoes_municipais;
CREATE TRIGGER trigger_sync_role_cache_municipio
    AFTER INSERT OR UPDATE OR DELETE ON direcoes_municipais
    FOR EACH ROW
    EXECUTE FUNCTION sync_role_cache_municipio();

-- ============================================
-- PARTE 4: Popular role_cache com dados existentes
-- ============================================

INSERT INTO role_cache (user_id, is_superadmin, is_direcao_municipal, municipio, updated_at)
SELECT 
    up.user_id,
    up.tipo_perfil = 'SUPERADMIN' AND up.ativo,
    up.tipo_perfil = 'DIRECAO_MUNICIPAL' AND up.ativo,
    dm.municipio,
    NOW()
FROM user_profiles up
LEFT JOIN direcoes_municipais dm ON up.user_id = dm.user_id
ON CONFLICT (user_id) DO UPDATE SET
    is_superadmin = EXCLUDED.is_superadmin,
    is_direcao_municipal = EXCLUDED.is_direcao_municipal,
    municipio = EXCLUDED.municipio,
    updated_at = NOW();

-- ============================================
-- PARTE 5: Funções helper que usam role_cache (SEM RECURSÃO!)
-- ============================================

CREATE OR REPLACE FUNCTION is_superadmin_cached()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM role_cache 
        WHERE user_id = auth.uid() AND is_superadmin = true
    );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION is_direcao_municipal_cached()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM role_cache 
        WHERE user_id = auth.uid() AND is_direcao_municipal = true
    );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_direcao_municipio_cached()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT municipio FROM role_cache 
        WHERE user_id = auth.uid() AND is_direcao_municipal = true
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- PARTE 6: Recriar policies de user_profiles usando role_cache
-- ============================================

-- SUPERADMIN pode ver todos os perfis
CREATE POLICY "SUPERADMIN can view all user_profiles"
    ON user_profiles FOR SELECT
    USING (is_superadmin_cached());

CREATE POLICY "SUPERADMIN can insert user_profiles"
    ON user_profiles FOR INSERT
    WITH CHECK (is_superadmin_cached());

CREATE POLICY "SUPERADMIN can update all user_profiles"
    ON user_profiles FOR UPDATE
    USING (is_superadmin_cached());

-- Direção Municipal pode ver perfis do seu município
CREATE POLICY "Direcao Municipal can view user_profiles in municipio"
    ON user_profiles FOR SELECT
    USING (
        is_direcao_municipal_cached() AND (
            user_id = auth.uid()
            OR
            escola_id IN (
                SELECT e.id FROM escolas e 
                WHERE e.municipio = get_direcao_municipio_cached()
            )
        )
    );

-- ============================================
-- PARTE 7: Corrigir RPC register_direcao_municipal
-- ============================================

CREATE OR REPLACE FUNCTION register_direcao_municipal(
    p_user_id UUID,
    p_nome TEXT,
    p_provincia TEXT,
    p_municipio TEXT,
    p_email TEXT,
    p_telefone TEXT DEFAULT NULL,
    p_cargo TEXT DEFAULT 'Director Municipal de Educação'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_profile_id UUID;
    v_existing_direcao_id UUID;
BEGIN
    -- Verificar se já existe um user_profile para este user_id
    SELECT id INTO v_existing_profile_id
    FROM user_profiles
    WHERE user_id = p_user_id;

    IF v_existing_profile_id IS NOT NULL THEN
        RAISE EXCEPTION 'Já existe um perfil para este utilizador';
    END IF;

    -- Verificar se já existe uma direção municipal activa para este município
    SELECT id INTO v_existing_direcao_id
    FROM direcoes_municipais
    WHERE municipio = p_municipio AND provincia = p_provincia AND ativo = true;

    IF v_existing_direcao_id IS NOT NULL THEN
        RAISE EXCEPTION 'Já existe uma Direção Municipal activa para % - %', p_municipio, p_provincia;
    END IF;

    -- Verificar se o email já está em uso
    SELECT id INTO v_existing_direcao_id
    FROM direcoes_municipais
    WHERE email = p_email;

    IF v_existing_direcao_id IS NOT NULL THEN
        RAISE EXCEPTION 'Este email já está associado a outra Direção Municipal';
    END IF;

    -- Criar o user_profile (inactivo - pendente aprovação)
    INSERT INTO user_profiles (user_id, tipo_perfil, escola_id, ativo)
    VALUES (p_user_id, 'DIRECAO_MUNICIPAL', NULL, false);

    -- Criar o registo da direção municipal (inactivo - pendente aprovação)
    INSERT INTO direcoes_municipais (
        user_id, nome, provincia, municipio, email, telefone, cargo, ativo
    ) VALUES (
        p_user_id, p_nome, p_provincia, p_municipio, p_email, p_telefone, p_cargo, false
    );

    -- Atualizar role_cache imediatamente (trigger pode ter delay)
    INSERT INTO role_cache (user_id, is_superadmin, is_direcao_municipal, municipio, updated_at)
    VALUES (p_user_id, false, false, p_municipio, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        is_direcao_municipal = false,  -- Pendente, ainda não activo
        municipio = p_municipio,
        updated_at = NOW();

END;
$$;

-- ============================================
-- PARTE 8: Corrigir RPC aprovar_direcao_municipal
-- ============================================

CREATE OR REPLACE FUNCTION aprovar_direcao_municipal(
    p_direcao_id UUID,
    p_aprovar BOOLEAN,
    p_motivo_rejeicao TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_direcao RECORD;
    v_user_id UUID;
BEGIN
    -- Verificar se é SUPERADMIN
    IF NOT is_superadmin_cached() THEN
        RAISE EXCEPTION 'Apenas SUPERADMIN pode aprovar/rejeitar Direções Municipais';
    END IF;

    SELECT * INTO v_direcao FROM direcoes_municipais WHERE id = p_direcao_id;

    IF v_direcao IS NULL THEN
        RAISE EXCEPTION 'Direção Municipal não encontrada';
    END IF;

    v_user_id := v_direcao.user_id;

    IF p_aprovar THEN
        UPDATE user_profiles SET ativo = true, updated_at = NOW()
        WHERE user_id = v_user_id AND tipo_perfil = 'DIRECAO_MUNICIPAL';

        UPDATE direcoes_municipais SET ativo = true, updated_at = NOW()
        WHERE id = p_direcao_id;

        -- Atualizar role_cache
        UPDATE role_cache SET is_direcao_municipal = true, updated_at = NOW()
        WHERE user_id = v_user_id;

        INSERT INTO notificacoes (user_id, tipo, titulo, mensagem)
        VALUES (v_user_id, 'sistema', 'Registo Aprovado! 🎉', 
            'O seu registo como Direção Municipal de ' || v_direcao.municipio || ' foi aprovado.');
    ELSE
        INSERT INTO notificacoes (user_id, tipo, titulo, mensagem)
        VALUES (v_user_id, 'sistema', 'Registo Não Aprovado',
            COALESCE(p_motivo_rejeicao, 'O seu registo como Direção Municipal não foi aprovado.'));

        UPDATE direcoes_municipais SET ativo = false, updated_at = NOW()
        WHERE id = p_direcao_id;
    END IF;
END;
$$;

-- ============================================
-- Permissões
-- ============================================

GRANT SELECT ON role_cache TO authenticated;
GRANT EXECUTE ON FUNCTION register_direcao_municipal(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION aprovar_direcao_municipal(UUID, BOOLEAN, TEXT) TO authenticated;

COMMENT ON TABLE role_cache IS 'Cache de roles para evitar recursão em policies de user_profiles. NÃO tem RLS.';
