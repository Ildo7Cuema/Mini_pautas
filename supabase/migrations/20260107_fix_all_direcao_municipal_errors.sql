-- ============================================
-- FIX CONSOLIDADO: Resolver TODOS os erros
-- 1. Coluna 'dados' não existe em notificacoes (remover inserção de notificação)
-- 2. Recursão infinita em policies de user_profiles
-- ============================================

-- ============================================
-- PARTE 1: Remover policies problemáticas de user_profiles
-- ============================================

DROP POLICY IF EXISTS "SUPERADMIN can view all user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "SUPERADMIN can insert user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "SUPERADMIN can update all user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Direcao Municipal can view user_profiles in municipio" ON user_profiles;
DROP POLICY IF EXISTS "Direcao Municipal can view user_profiles in municipio v2" ON user_profiles;
DROP POLICY IF EXISTS "Direcao Municipal can view user_profiles in municipio safe" ON user_profiles;
DROP POLICY IF EXISTS "SUPERADMIN can view all user_profiles safe" ON user_profiles;
DROP POLICY IF EXISTS "SUPERADMIN can insert user_profiles safe" ON user_profiles;
DROP POLICY IF EXISTS "SUPERADMIN can update all user_profiles safe" ON user_profiles;

-- ============================================
-- PARTE 2: Criar funções helper SEGURAS (SECURITY DEFINER bypassa RLS)
-- ============================================

CREATE OR REPLACE FUNCTION is_superadmin_safe()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT tipo_perfil = 'SUPERADMIN' AND ativo = true
        FROM user_profiles
        WHERE user_id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_direcao_municipal_safe()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM direcoes_municipais dm
        WHERE dm.user_id = auth.uid() 
        AND dm.ativo = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_direcao_municipio_safe()
RETURNS TEXT AS $$
DECLARE
    municipio_result TEXT;
BEGIN
    SELECT dm.municipio INTO municipio_result
    FROM direcoes_municipais dm
    WHERE dm.user_id = auth.uid() 
    AND dm.ativo = true
    LIMIT 1;
    RETURN municipio_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- PARTE 3: Recriar policies de user_profiles com funções seguras
-- ============================================

CREATE POLICY "SUPERADMIN can view all user_profiles"
    ON user_profiles FOR SELECT
    USING (is_superadmin_safe());

CREATE POLICY "SUPERADMIN can insert user_profiles"
    ON user_profiles FOR INSERT
    WITH CHECK (is_superadmin_safe());

CREATE POLICY "SUPERADMIN can update all user_profiles"
    ON user_profiles FOR UPDATE
    USING (is_superadmin_safe());

CREATE POLICY "Direcao Municipal can view user_profiles in municipio"
    ON user_profiles FOR SELECT
    USING (
        is_direcao_municipal_safe() AND (
            user_id = auth.uid()
            OR
            escola_id IN (
                SELECT e.id FROM escolas e 
                WHERE e.municipio = get_direcao_municipio_safe()
            )
        )
    );

-- ============================================
-- PARTE 4: Corrigir RPC register_direcao_municipal (sem notificação problemática)
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

    -- Verificar se já existe uma direção municipal para este município
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
        user_id,
        nome,
        provincia,
        municipio,
        email,
        telefone,
        cargo,
        ativo
    ) VALUES (
        p_user_id,
        p_nome,
        p_provincia,
        p_municipio,
        p_email,
        p_telefone,
        p_cargo,
        false  -- Pendente aprovação
    );

    -- NOTA: Notificação para SUPERADMIN removida porque a tabela notificacoes
    -- não tem a coluna 'dados'. O SUPERADMIN verá os pendentes via view.

END;
$$;

-- ============================================
-- PARTE 5: Corrigir RPC aprovar_direcao_municipal
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
    -- Verificar se é SUPERADMIN (usando função segura)
    IF NOT is_superadmin_safe() THEN
        RAISE EXCEPTION 'Apenas SUPERADMIN pode aprovar/rejeitar Direções Municipais';
    END IF;

    -- Buscar dados da direção
    SELECT * INTO v_direcao
    FROM direcoes_municipais
    WHERE id = p_direcao_id;

    IF v_direcao IS NULL THEN
        RAISE EXCEPTION 'Direção Municipal não encontrada';
    END IF;

    v_user_id := v_direcao.user_id;

    IF p_aprovar THEN
        -- Activar o user_profile
        UPDATE user_profiles
        SET ativo = true, updated_at = NOW()
        WHERE user_id = v_user_id AND tipo_perfil = 'DIRECAO_MUNICIPAL';

        -- Activar a direção municipal
        UPDATE direcoes_municipais
        SET ativo = true, updated_at = NOW()
        WHERE id = p_direcao_id;

        -- Notificar o utilizador (usando colunas existentes)
        INSERT INTO notificacoes (user_id, tipo, titulo, mensagem)
        VALUES (
            v_user_id,
            'sistema',
            'Registo Aprovado! 🎉',
            'O seu registo como Direção Municipal de ' || v_direcao.municipio || ' foi aprovado. Já pode aceder ao sistema.'
        );
    ELSE
        -- Notificar o utilizador da rejeição
        INSERT INTO notificacoes (user_id, tipo, titulo, mensagem)
        VALUES (
            v_user_id,
            'sistema',
            'Registo Não Aprovado',
            COALESCE(p_motivo_rejeicao, 'O seu registo como Direção Municipal não foi aprovado.')
        );

        -- Manter para histórico mas marcado como inactivo
        UPDATE direcoes_municipais
        SET ativo = false, updated_at = NOW()
        WHERE id = p_direcao_id;
    END IF;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION register_direcao_municipal(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION aprovar_direcao_municipal(UUID, BOOLEAN, TEXT) TO authenticated;
