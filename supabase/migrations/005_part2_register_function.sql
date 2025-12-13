-- PARTE 2: Criar função register_escola
-- Execute esta parte depois da PARTE 1

CREATE OR REPLACE FUNCTION register_escola(
    p_user_id UUID,
    p_nome TEXT,
    p_codigo_escola TEXT,
    p_provincia TEXT,
    p_municipio TEXT,
    p_endereco TEXT DEFAULT NULL,
    p_telefone TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_configuracoes JSONB DEFAULT '{}'::jsonb
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS '
DECLARE
    v_escola_id UUID;
    v_result JSON;
BEGIN
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION ''User ID mismatch'';
    END IF;

    IF EXISTS (SELECT 1 FROM escolas WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION ''Utilizador ja tem uma escola registada'';
    END IF;

    IF EXISTS (SELECT 1 FROM escolas WHERE codigo_escola = p_codigo_escola) THEN
        RAISE EXCEPTION ''Codigo de escola ja existe'';
    END IF;

    IF p_email IS NOT NULL AND EXISTS (SELECT 1 FROM escolas WHERE email = p_email) THEN
        RAISE EXCEPTION ''Email ja esta em uso por outra escola'';
    END IF;

    INSERT INTO escolas (
        user_id, nome, codigo_escola, provincia, municipio,
        endereco, telefone, email, configuracoes
    ) VALUES (
        p_user_id, p_nome, p_codigo_escola, p_provincia, p_municipio,
        p_endereco, p_telefone, p_email, p_configuracoes
    )
    RETURNING id INTO v_escola_id;

    INSERT INTO user_profiles (user_id, tipo_perfil, escola_id, ativo)
    VALUES (p_user_id, ''ESCOLA'', v_escola_id, true)
    ON CONFLICT (user_id) DO UPDATE SET 
        escola_id = v_escola_id,
        tipo_perfil = ''ESCOLA'',
        ativo = true;

    SELECT json_build_object(
        ''id'', e.id,
        ''nome'', e.nome,
        ''codigo_escola'', e.codigo_escola,
        ''provincia'', e.provincia,
        ''municipio'', e.municipio,
        ''endereco'', e.endereco,
        ''telefone'', e.telefone,
        ''email'', e.email
    ) INTO v_result
    FROM escolas e
    WHERE e.id = v_escola_id;

    RETURN v_result;
END;
';

GRANT EXECUTE ON FUNCTION register_escola(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
