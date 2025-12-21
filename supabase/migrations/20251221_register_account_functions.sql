-- ============================================
-- FUNÇÃO PARA REGISTAR ALUNO/ENCARREGADO
-- Usa SECURITY DEFINER para bypass de RLS
-- ============================================

-- Function to link a new auth user to an aluno record and create user_profile
CREATE OR REPLACE FUNCTION public.register_student_account(
    p_aluno_id UUID,
    p_user_id UUID,
    p_email TEXT
)
RETURNS JSON AS $$
DECLARE
    v_escola_id UUID;
    v_result JSON;
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

    -- Create user_profile
    INSERT INTO user_profiles (user_id, tipo_perfil, escola_id, ativo)
    VALUES (p_user_id, 'ALUNO', v_escola_id, true)
    ON CONFLICT (user_id) DO UPDATE 
    SET tipo_perfil = 'ALUNO', escola_id = v_escola_id, ativo = true;

    RETURN json_build_object('success', true, 'escola_id', v_escola_id);
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to link a new auth user as encarregado and create user_profile
CREATE OR REPLACE FUNCTION public.register_guardian_account(
    p_aluno_id UUID,
    p_user_id UUID,
    p_email TEXT
)
RETURNS JSON AS $$
DECLARE
    v_escola_id UUID;
    v_result JSON;
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

    -- Create user_profile
    INSERT INTO user_profiles (user_id, tipo_perfil, escola_id, ativo)
    VALUES (p_user_id, 'ENCARREGADO', v_escola_id, true)
    ON CONFLICT (user_id) DO UPDATE 
    SET tipo_perfil = 'ENCARREGADO', escola_id = v_escola_id, ativo = true;

    RETURN json_build_object('success', true, 'escola_id', v_escola_id);
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.register_student_account(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_guardian_account(UUID, UUID, TEXT) TO authenticated;

-- Also grant to anon for registration flow (user might not be fully authenticated yet)
GRANT EXECUTE ON FUNCTION public.register_student_account(UUID, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.register_guardian_account(UUID, UUID, TEXT) TO anon;
