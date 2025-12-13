-- ============================================
-- MIGRATION 005: Fix Escola Registration
-- Purpose: Create RPC function to handle school registration bypassing RLS
-- ============================================

-- ============================================
-- DROP EXISTING PROBLEMATIC POLICIES
-- ============================================

DROP POLICY IF EXISTS "Escolas podem criar próprio registro" ON escolas;
DROP POLICY IF EXISTS "Schools can view their teachers profiles" ON user_profiles;
DROP POLICY IF EXISTS "Schools can create teacher profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can create own escola profile" ON user_profiles;

-- ============================================
-- CREATE RPC FUNCTION FOR SCHOOL REGISTRATION
-- ============================================

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
AS $func$
DECLARE
    v_escola_id UUID;
    v_result JSON;
BEGIN
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'User ID mismatch';
    END IF;

    IF EXISTS (SELECT 1 FROM escolas WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User already has a registered escola';
    END IF;

    IF EXISTS (SELECT 1 FROM escolas WHERE codigo_escola = p_codigo_escola) THEN
        RAISE EXCEPTION 'Codigo de escola ja existe';
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
    VALUES (p_user_id, 'ESCOLA', v_escola_id, true)
    ON CONFLICT (user_id) DO UPDATE SET 
        escola_id = v_escola_id,
        tipo_perfil = 'ESCOLA',
        ativo = true;

    SELECT json_build_object(
        'id', e.id,
        'nome', e.nome,
        'codigo_escola', e.codigo_escola,
        'provincia', e.provincia,
        'municipio', e.municipio,
        'endereco', e.endereco,
        'telefone', e.telefone,
        'email', e.email
    ) INTO v_result
    FROM escolas e
    WHERE e.id = v_escola_id;

    RETURN v_result;
END;
$func$;

GRANT EXECUTE ON FUNCTION register_escola(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- ============================================
-- HELPER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_current_user_escola_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $func$
DECLARE
    escola_uuid UUID;
BEGIN
    SELECT escola_id INTO escola_uuid
    FROM user_profiles
    WHERE user_id = auth.uid() AND ativo = true
    LIMIT 1;
    RETURN escola_uuid;
END;
$func$;

GRANT EXECUTE ON FUNCTION get_current_user_escola_id() TO authenticated;

-- ============================================
-- RECREATE POLICIES
-- ============================================

CREATE POLICY "Escolas podem ver proprio registro"
    ON escolas FOR SELECT
    USING (user_id = auth.uid() OR id = get_current_user_escola_id());

CREATE POLICY "Escolas podem criar proprio registro"
    ON escolas FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Schools can view their teachers profiles"
    ON user_profiles FOR SELECT
    USING (escola_id = get_current_user_escola_id());

CREATE POLICY "Users can create own escola profile"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid() AND tipo_perfil = 'ESCOLA');

CREATE POLICY "Schools can create teacher profiles"
    ON user_profiles FOR INSERT
    WITH CHECK (tipo_perfil = 'PROFESSOR' AND escola_id = get_current_user_escola_id());
