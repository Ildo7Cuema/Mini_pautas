-- ============================================
-- FUNÇÕES ACTUALIZADAS PARA SUPORTE A PERFIS MÚLTIPLOS
-- Permite que um utilizador tenha perfil de ALUNO e ENCARREGADO
-- ============================================

-- Drop existing functions first
DROP FUNCTION IF EXISTS public.register_student_account(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.register_guardian_account(UUID, UUID, TEXT);

-- Function to link a new auth user to an aluno record and create user_profile
-- This version handles users that might already have a profile
CREATE OR REPLACE FUNCTION public.register_student_account(
    p_aluno_id UUID,
    p_user_id UUID,
    p_email TEXT
)
RETURNS JSON AS $$
DECLARE
    v_escola_id UUID;
    v_existing_profile user_profiles%ROWTYPE;
BEGIN
    -- Get escola_id from aluno's turma
    SELECT t.escola_id INTO v_escola_id
    FROM alunos a
    JOIN turmas t ON t.id = a.turma_id
    WHERE a.id = p_aluno_id;

    IF v_escola_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Aluno ou turma não encontrado');
    END IF;

    -- Update aluno with user_id
    UPDATE alunos 
    SET user_id = p_user_id 
    WHERE id = p_aluno_id AND user_id IS NULL;

    -- Check if user already has a profile
    SELECT * INTO v_existing_profile 
    FROM user_profiles 
    WHERE user_id = p_user_id;

    IF v_existing_profile.user_id IS NOT NULL THEN
        -- User already has profile, update to include ALUNO if not already
        -- For now, we prioritize the new ALUNO role
        UPDATE user_profiles 
        SET tipo_perfil = 'ALUNO', escola_id = v_escola_id, ativo = true
        WHERE user_id = p_user_id;
    ELSE
        -- Create new user_profile
        INSERT INTO user_profiles (user_id, tipo_perfil, escola_id, ativo)
        VALUES (p_user_id, 'ALUNO', v_escola_id, true);
    END IF;

    RETURN json_build_object('success', true, 'escola_id', v_escola_id);
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to link an existing or new user as encarregado
-- This version checks if user already exists in auth and handles it
CREATE OR REPLACE FUNCTION public.register_guardian_account(
    p_aluno_id UUID,
    p_user_id UUID,
    p_email TEXT
)
RETURNS JSON AS $$
DECLARE
    v_escola_id UUID;
    v_existing_profile user_profiles%ROWTYPE;
BEGIN
    -- Get escola_id from aluno's turma
    SELECT t.escola_id INTO v_escola_id
    FROM alunos a
    JOIN turmas t ON t.id = a.turma_id
    WHERE a.id = p_aluno_id;

    IF v_escola_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Aluno ou turma não encontrado');
    END IF;

    -- Update aluno with encarregado_user_id
    UPDATE alunos 
    SET encarregado_user_id = p_user_id 
    WHERE id = p_aluno_id AND encarregado_user_id IS NULL;

    -- Check if user already has a profile
    SELECT * INTO v_existing_profile 
    FROM user_profiles 
    WHERE user_id = p_user_id;

    IF v_existing_profile.user_id IS NOT NULL THEN
        -- User already has profile - update to ENCARREGADO
        UPDATE user_profiles 
        SET tipo_perfil = 'ENCARREGADO', escola_id = v_escola_id, ativo = true
        WHERE user_id = p_user_id;
    ELSE
        -- Create new user_profile
        INSERT INTO user_profiles (user_id, tipo_perfil, escola_id, ativo)
        VALUES (p_user_id, 'ENCARREGADO', v_escola_id, true);
    END IF;

    RETURN json_build_object('success', true, 'escola_id', v_escola_id);
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- NEW: Function to link an existing user as encarregado (without creating new auth)
-- This is for when the user already has an account (e.g., as ALUNO or PROFESSOR)
CREATE OR REPLACE FUNCTION public.link_existing_user_as_guardian(
    p_aluno_id UUID,
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_escola_id UUID;
BEGIN
    -- Get escola_id from aluno's turma
    SELECT t.escola_id INTO v_escola_id
    FROM alunos a
    JOIN turmas t ON t.id = a.turma_id
    WHERE a.id = p_aluno_id;

    IF v_escola_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Aluno ou turma não encontrado');
    END IF;

    -- Update aluno with encarregado_user_id
    UPDATE alunos 
    SET encarregado_user_id = p_user_id 
    WHERE id = p_aluno_id;

    RETURN json_build_object('success', true, 'escola_id', v_escola_id, 'message', 'Utilizador ligado como encarregado');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.register_student_account(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_guardian_account(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_existing_user_as_guardian(UUID, UUID) TO authenticated;

GRANT EXECUTE ON FUNCTION public.register_student_account(UUID, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.register_guardian_account(UUID, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.link_existing_user_as_guardian(UUID, UUID) TO anon;
