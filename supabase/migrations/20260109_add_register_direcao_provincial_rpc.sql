-- Migration: Adicionar RPC para registo de Direção Provincial
-- As Direções Provinciais são criadas com ativo = false (pendente aprovação SUPERADMIN)

-- Função RPC para registo de Direção Provincial (bypassa RLS)
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
    -- Verificar se já existe um user_profile para este user_id
    SELECT id INTO v_existing_profile_id
    FROM user_profiles
    WHERE user_id = p_user_id;

    IF v_existing_profile_id IS NOT NULL THEN
        RAISE EXCEPTION 'Já existe um perfil para este utilizador';
    END IF;

    -- Verificar se já existe uma direção provincial para esta província
    SELECT id INTO v_existing_direcao_id
    FROM direcoes_provinciais
    WHERE provincia = p_provincia AND ativo = true;

    IF v_existing_direcao_id IS NOT NULL THEN
        RAISE EXCEPTION 'Já existe uma Direção Provincial activa para %', p_provincia;
    END IF;

    -- Verificar se o email já está em uso
    SELECT id INTO v_existing_direcao_id
    FROM direcoes_provinciais
    WHERE email = p_email;

    IF v_existing_direcao_id IS NOT NULL THEN
        RAISE EXCEPTION 'Este email já está associado a outra Direção Provincial';
    END IF;

    -- Criar o user_profile (inactivo - pendente aprovação)
    INSERT INTO user_profiles (user_id, tipo_perfil, escola_id, ativo)
    VALUES (p_user_id, 'DIRECAO_PROVINCIAL', NULL, false);

    -- Criar o registo da direção provincial (inactivo - pendente aprovação)
    INSERT INTO direcoes_provinciais (
        user_id,
        nome,
        provincia,
        email,
        telefone,
        cargo,
        ativo
    ) VALUES (
        p_user_id,
        p_nome,
        p_provincia,
        p_email,
        p_telefone,
        p_cargo,
        false  -- Pendente aprovação
    );

    -- Criar notificação para SUPERADMIN
    INSERT INTO notificacoes (
        user_id,
        tipo,
        titulo,
        mensagem,
        dados
    )
    SELECT 
        up.user_id,
        'sistema',
        'Nova Direção Provincial Pendente',
        'Nova solicitação de registo de Direção Provincial de ' || p_provincia || ' aguarda aprovação.',
        jsonb_build_object(
            'tipo', 'aprovacao_direcao_provincial',
            'direcao_nome', p_nome,
            'provincia', p_provincia,
            'email', p_email
        )
    FROM user_profiles up
    WHERE up.tipo_perfil = 'SUPERADMIN' AND up.ativo = true;

END;
$$;

-- Conceder permissão de execução para utilizadores autenticados
GRANT EXECUTE ON FUNCTION register_direcao_provincial(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Comentário explicativo
COMMENT ON FUNCTION register_direcao_provincial IS 
'Regista uma nova Direção Provincial. O perfil é criado como inactivo e requer aprovação do SUPERADMIN. Notifica automaticamente os SUPERADMINs.';

-- Função para SUPERADMIN aprovar/rejeitar Direção Provincial
CREATE OR REPLACE FUNCTION aprovar_direcao_provincial(
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
    IF NOT is_superadmin() THEN
        RAISE EXCEPTION 'Apenas SUPERADMIN pode aprovar/rejeitar Direções Provinciais';
    END IF;

    -- Buscar dados da direção
    SELECT * INTO v_direcao
    FROM direcoes_provinciais
    WHERE id = p_direcao_id;

    IF v_direcao IS NULL THEN
        RAISE EXCEPTION 'Direção Provincial não encontrada';
    END IF;

    v_user_id := v_direcao.user_id;

    IF p_aprovar THEN
        -- Activar o user_profile
        UPDATE user_profiles
        SET ativo = true, updated_at = NOW()
        WHERE user_id = v_user_id AND tipo_perfil = 'DIRECAO_PROVINCIAL';

        -- Activar a direção provincial
        UPDATE direcoes_provinciais
        SET ativo = true, updated_at = NOW()
        WHERE id = p_direcao_id;

        -- Notificar o utilizador
        INSERT INTO notificacoes (user_id, tipo, titulo, mensagem, dados)
        VALUES (
            v_user_id,
            'sistema',
            'Registo Aprovado! 🎉',
            'O seu registo como Direção Provincial de ' || v_direcao.provincia || ' foi aprovado. Já pode aceder ao sistema.',
            jsonb_build_object('tipo', 'aprovacao_confirmada')
        );
    ELSE
        -- Notificar o utilizador da rejeição
        INSERT INTO notificacoes (user_id, tipo, titulo, mensagem, dados)
        VALUES (
            v_user_id,
            'sistema',
            'Registo Não Aprovado',
            COALESCE(p_motivo_rejeicao, 'O seu registo como Direção Provincial não foi aprovado. Por favor, contacte o suporte para mais informações.'),
            jsonb_build_object('tipo', 'aprovacao_rejeitada', 'motivo', p_motivo_rejeicao)
        );

        -- Opcional: Eliminar registos ou mantê-los para auditoria
        -- Por agora, mantemos para histórico mas marcamos como rejeitado
        UPDATE direcoes_provinciais
        SET 
            ativo = false, 
            updated_at = NOW()
        WHERE id = p_direcao_id;
    END IF;
END;
$$;

-- Conceder permissão apenas para autenticados (a função verifica internamente se é SUPERADMIN)
GRANT EXECUTE ON FUNCTION aprovar_direcao_provincial(UUID, BOOLEAN, TEXT) TO authenticated;

COMMENT ON FUNCTION aprovar_direcao_provincial IS
'Permite ao SUPERADMIN aprovar ou rejeitar uma Direção Provincial pendente.';

-- View para listar Direções Provinciais pendentes (para SUPERADMIN)
CREATE OR REPLACE VIEW direcoes_provinciais_pendentes AS
SELECT 
    dp.id,
    dp.nome,
    dp.provincia,
    dp.email,
    dp.telefone,
    dp.cargo,
    dp.created_at,
    up.user_id
FROM direcoes_provinciais dp
JOIN user_profiles up ON dp.user_id = up.user_id
WHERE dp.ativo = false AND up.ativo = false AND up.tipo_perfil = 'DIRECAO_PROVINCIAL';

-- Dar acesso à view para SUPERADMIN
GRANT SELECT ON direcoes_provinciais_pendentes TO authenticated;
