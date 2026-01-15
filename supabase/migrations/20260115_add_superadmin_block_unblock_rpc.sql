-- ============================================
-- MIGRATION: Add SuperAdmin Block/Unblock RPC Functions
-- Purpose: Create SECURITY DEFINER functions for SuperAdmin to block/unblock escolas
-- This bypasses RLS issues while still validating SuperAdmin role
-- Date: 2026-01-15
-- ============================================

-- Function to block escola (SuperAdmin only)
CREATE OR REPLACE FUNCTION superadmin_block_escola(
    p_escola_id UUID,
    p_motivo TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_is_superadmin BOOLEAN;
    v_result JSON;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Utilizador não autenticado');
    END IF;
    
    -- Check if user is SuperAdmin
    SELECT EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = v_user_id 
        AND tipo_perfil = 'SUPERADMIN' 
        AND ativo = true
    ) INTO v_is_superadmin;
    
    IF NOT v_is_superadmin THEN
        RETURN json_build_object('success', false, 'error', 'Utilizador não tem permissão de SuperAdmin');
    END IF;
    
    -- Check if escola exists
    IF NOT EXISTS (SELECT 1 FROM escolas WHERE id = p_escola_id) THEN
        RETURN json_build_object('success', false, 'error', 'Escola não encontrada');
    END IF;
    
    -- Block the escola
    UPDATE escolas SET
        bloqueado = true,
        bloqueado_motivo = p_motivo,
        bloqueado_em = NOW(),
        bloqueado_por = v_user_id
    WHERE id = p_escola_id;
    
    RETURN json_build_object(
        'success', true, 
        'message', 'Escola bloqueada com sucesso',
        'escola_id', p_escola_id
    );
END;
$$;

-- Function to unblock escola (SuperAdmin only)
CREATE OR REPLACE FUNCTION superadmin_unblock_escola(
    p_escola_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_is_superadmin BOOLEAN;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Utilizador não autenticado');
    END IF;
    
    -- Check if user is SuperAdmin
    SELECT EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = v_user_id 
        AND tipo_perfil = 'SUPERADMIN' 
        AND ativo = true
    ) INTO v_is_superadmin;
    
    IF NOT v_is_superadmin THEN
        RETURN json_build_object('success', false, 'error', 'Utilizador não tem permissão de SuperAdmin');
    END IF;
    
    -- Check if escola exists
    IF NOT EXISTS (SELECT 1 FROM escolas WHERE id = p_escola_id) THEN
        RETURN json_build_object('success', false, 'error', 'Escola não encontrada');
    END IF;
    
    -- Unblock the escola
    UPDATE escolas SET
        bloqueado = false,
        bloqueado_motivo = NULL,
        bloqueado_em = NULL,
        bloqueado_por = NULL
    WHERE id = p_escola_id;
    
    RETURN json_build_object(
        'success', true, 
        'message', 'Escola desbloqueada com sucesso',
        'escola_id', p_escola_id
    );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION superadmin_block_escola(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION superadmin_unblock_escola(UUID) TO authenticated;

-- Add comments
COMMENT ON FUNCTION superadmin_block_escola IS 'Blocks a escola - SuperAdmin only. Uses SECURITY DEFINER to bypass RLS.';
COMMENT ON FUNCTION superadmin_unblock_escola IS 'Unblocks a escola - SuperAdmin only. Uses SECURITY DEFINER to bypass RLS.';

-- ============================================
-- END OF MIGRATION
-- ============================================
