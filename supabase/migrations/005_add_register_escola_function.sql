-- ============================================
-- MIGRATION 005: Add RPC Function for School Registration
-- Purpose: Create RPC function to register schools bypassing RLS
-- ============================================

-- Function to register a new escola
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
RETURNS UUID AS $$
DECLARE
    v_escola_id UUID;
BEGIN
    -- Insert escola record
    INSERT INTO escolas (
        user_id,
        nome,
        codigo_escola,
        provincia,
        municipio,
        endereco,
        telefone,
        email,
        configuracoes
    ) VALUES (
        p_user_id,
        p_nome,
        p_codigo_escola,
        p_provincia,
        p_municipio,
        p_endereco,
        p_telefone,
        p_email,
        p_configuracoes
    )
    RETURNING id INTO v_escola_id;
    
    -- The trigger will automatically create the user_profile
    
    RETURN v_escola_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION register_escola(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- Comment for documentation
COMMENT ON FUNCTION register_escola IS 'Registers a new school and creates associated user profile. Bypasses RLS for initial registration.';
