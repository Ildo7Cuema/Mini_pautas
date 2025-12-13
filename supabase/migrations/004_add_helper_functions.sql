-- ============================================
-- MIGRATION 004: Add Helper Functions for Permissions
-- Purpose: Create utility functions for permission checks and user context
-- ============================================

-- Function to check if current user is a school admin
CREATE OR REPLACE FUNCTION is_escola()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA' AND ativo = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if current user is a professor
CREATE OR REPLACE FUNCTION is_professor()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() AND tipo_perfil = 'PROFESSOR' AND ativo = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get the escola_id of the current user
CREATE OR REPLACE FUNCTION get_user_escola_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT escola_id 
        FROM user_profiles 
        WHERE user_id = auth.uid() AND ativo = true
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get the professor_id of the current user
CREATE OR REPLACE FUNCTION get_user_professor_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT id 
        FROM professores 
        WHERE user_id = auth.uid() AND ativo = true
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get user profile type
CREATE OR REPLACE FUNCTION get_user_profile_type()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT tipo_perfil 
        FROM user_profiles 
        WHERE user_id = auth.uid() AND ativo = true
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if professor has access to a specific turma
CREATE OR REPLACE FUNCTION professor_has_turma_access(turma_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM turma_professores tp
        JOIN professores p ON p.id = tp.professor_id
        WHERE p.user_id = auth.uid() 
            AND tp.turma_id = turma_uuid
            AND p.ativo = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if professor can grade in a specific turma/disciplina
CREATE OR REPLACE FUNCTION professor_can_grade(turma_uuid UUID, disciplina_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM turma_professores tp
        JOIN professores p ON p.id = tp.professor_id
        WHERE p.user_id = auth.uid() 
            AND tp.turma_id = turma_uuid
            AND tp.disciplina_id = disciplina_uuid
            AND p.ativo = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user belongs to a specific escola
CREATE OR REPLACE FUNCTION user_belongs_to_escola(escola_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM user_profiles 
        WHERE user_id = auth.uid() 
            AND escola_id = escola_uuid
            AND ativo = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get all turmas accessible by current user
CREATE OR REPLACE FUNCTION get_user_accessible_turmas()
RETURNS TABLE (turma_id UUID) AS $$
BEGIN
    -- If escola, return all turmas from their school
    IF is_escola() THEN
        RETURN QUERY
        SELECT t.id
        FROM turmas t
        WHERE t.escola_id = get_user_escola_id();
    -- If professor, return only assigned turmas
    ELSIF is_professor() THEN
        RETURN QUERY
        SELECT DISTINCT tp.turma_id
        FROM turma_professores tp
        JOIN professores p ON p.id = tp.professor_id
        WHERE p.user_id = auth.uid() AND p.ativo = true;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get all disciplinas accessible by current user in a turma
CREATE OR REPLACE FUNCTION get_user_accessible_disciplinas(turma_uuid UUID DEFAULT NULL)
RETURNS TABLE (disciplina_id UUID) AS $$
BEGIN
    -- If escola, return all disciplinas from their school's turmas
    IF is_escola() THEN
        IF turma_uuid IS NULL THEN
            RETURN QUERY
            SELECT d.id
            FROM disciplinas d
            JOIN turmas t ON t.id = d.turma_id
            WHERE t.escola_id = get_user_escola_id();
        ELSE
            RETURN QUERY
            SELECT d.id
            FROM disciplinas d
            JOIN turmas t ON t.id = d.turma_id
            WHERE t.escola_id = get_user_escola_id()
                AND d.turma_id = turma_uuid;
        END IF;
    -- If professor, return only assigned disciplinas
    ELSIF is_professor() THEN
        IF turma_uuid IS NULL THEN
            RETURN QUERY
            SELECT DISTINCT tp.disciplina_id
            FROM turma_professores tp
            JOIN professores p ON p.id = tp.professor_id
            WHERE p.user_id = auth.uid() AND p.ativo = true;
        ELSE
            RETURN QUERY
            SELECT DISTINCT tp.disciplina_id
            FROM turma_professores tp
            JOIN professores p ON p.id = tp.professor_id
            WHERE p.user_id = auth.uid() 
                AND p.ativo = true
                AND tp.turma_id = turma_uuid;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to validate if a grade entry is allowed
CREATE OR REPLACE FUNCTION validate_grade_entry(
    p_aluno_id UUID,
    p_componente_id UUID,
    p_turma_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_disciplina_id UUID;
BEGIN
    -- Get disciplina_id from componente
    SELECT disciplina_id INTO v_disciplina_id
    FROM componentes_avaliacao
    WHERE id = p_componente_id;
    
    -- Check if aluno belongs to the turma
    IF NOT EXISTS (
        SELECT 1 FROM alunos 
        WHERE id = p_aluno_id AND turma_id = p_turma_id AND ativo = true
    ) THEN
        RETURN false;
    END IF;
    
    -- Check if componente belongs to the turma
    IF NOT EXISTS (
        SELECT 1 FROM componentes_avaliacao 
        WHERE id = p_componente_id AND turma_id = p_turma_id
    ) THEN
        RETURN false;
    END IF;
    
    -- If escola, allow
    IF is_escola() THEN
        RETURN user_belongs_to_escola((
            SELECT escola_id FROM turmas WHERE id = p_turma_id
        ));
    END IF;
    
    -- If professor, check if they can grade this turma/disciplina
    IF is_professor() THEN
        RETURN professor_can_grade(p_turma_id, v_disciplina_id);
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get professor's turmas with disciplinas
CREATE OR REPLACE FUNCTION get_professor_turmas_disciplinas(p_professor_id UUID)
RETURNS TABLE (
    turma_id UUID,
    turma_nome TEXT,
    disciplina_id UUID,
    disciplina_nome TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id as turma_id,
        t.nome as turma_nome,
        d.id as disciplina_id,
        d.nome as disciplina_nome
    FROM turma_professores tp
    JOIN turmas t ON t.id = tp.turma_id
    JOIN disciplinas d ON d.id = tp.disciplina_id
    WHERE tp.professor_id = p_professor_id
    ORDER BY t.nome, d.nome;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to generate temporary password for new professor
CREATE OR REPLACE FUNCTION generate_temp_password()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..12 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_escola() TO authenticated;
GRANT EXECUTE ON FUNCTION is_professor() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_escola_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_professor_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile_type() TO authenticated;
GRANT EXECUTE ON FUNCTION professor_has_turma_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION professor_can_grade(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_belongs_to_escola(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_accessible_turmas() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_accessible_disciplinas(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_grade_entry(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_professor_turmas_disciplinas(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_temp_password() TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION is_escola() IS 'Returns true if current user is a school admin';
COMMENT ON FUNCTION is_professor() IS 'Returns true if current user is a professor';
COMMENT ON FUNCTION get_user_escola_id() IS 'Returns the escola_id of the current user';
COMMENT ON FUNCTION get_user_professor_id() IS 'Returns the professor_id of the current user';
COMMENT ON FUNCTION professor_has_turma_access(UUID) IS 'Checks if professor has access to a specific turma';
COMMENT ON FUNCTION professor_can_grade(UUID, UUID) IS 'Checks if professor can grade in a specific turma/disciplina';
COMMENT ON FUNCTION validate_grade_entry(UUID, UUID, UUID) IS 'Validates if a grade entry is allowed for current user';
