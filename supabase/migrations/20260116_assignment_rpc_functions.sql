-- ============================================
-- MIGRATION: Assignment RPC Functions
-- Date: 2026-01-16
-- Purpose: RPC functions for assigning professors to disciplines/turmas
-- ============================================

-- ============================================
-- 1. FUNCTION TO ASSIGN PROFESSOR TO DISCIPLINE
-- ============================================

CREATE OR REPLACE FUNCTION assign_professor_to_disciplina(
    p_turma_id UUID,
    p_professor_id UUID,
    p_disciplina_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_turma_escola_id UUID;
    v_professor_escola_id UUID;
    v_disciplina_turma_id UUID;
    v_result JSONB;
BEGIN
    -- Validate that turma exists and get its escola_id
    SELECT escola_id INTO v_turma_escola_id
    FROM turmas WHERE id = p_turma_id;
    
    IF v_turma_escola_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Turma não encontrada');
    END IF;
    
    -- Validate that professor exists and belongs to the same school
    SELECT escola_id INTO v_professor_escola_id
    FROM professores WHERE id = p_professor_id;
    
    IF v_professor_escola_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Professor não encontrado');
    END IF;
    
    IF v_turma_escola_id != v_professor_escola_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Professor deve pertencer à mesma escola que a turma');
    END IF;
    
    -- Validate that disciplina exists and belongs to the turma
    SELECT turma_id INTO v_disciplina_turma_id
    FROM disciplinas WHERE id = p_disciplina_id;
    
    IF v_disciplina_turma_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Disciplina não encontrada');
    END IF;
    
    IF v_disciplina_turma_id != p_turma_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Disciplina deve pertencer à turma especificada');
    END IF;
    
    -- Insert or update the assignment
    INSERT INTO turma_professores (turma_id, professor_id, disciplina_id)
    VALUES (p_turma_id, p_professor_id, p_disciplina_id)
    ON CONFLICT (turma_id, professor_id, disciplina_id) 
    DO NOTHING;
    
    -- Also update the disciplina.professor_id for backwards compatibility
    UPDATE disciplinas
    SET professor_id = p_professor_id
    WHERE id = p_disciplina_id;
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Professor atribuído com sucesso',
        'turma_id', p_turma_id,
        'professor_id', p_professor_id,
        'disciplina_id', p_disciplina_id
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. FUNCTION TO REMOVE PROFESSOR ASSIGNMENT
-- ============================================

CREATE OR REPLACE FUNCTION remove_professor_from_disciplina(
    p_turma_id UUID,
    p_professor_id UUID,
    p_disciplina_id UUID
)
RETURNS JSONB AS $$
BEGIN
    DELETE FROM turma_professores
    WHERE turma_id = p_turma_id
      AND professor_id = p_professor_id
      AND disciplina_id = p_disciplina_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Atribuição não encontrada');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', 'Atribuição removida com sucesso');
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. FUNCTION TO GET PROFESSOR ASSIGNMENTS FOR A TURMA
-- ============================================

CREATE OR REPLACE FUNCTION get_turma_professor_assignments(p_turma_id UUID)
RETURNS TABLE (
    id UUID,
    turma_id UUID,
    professor_id UUID,
    professor_nome TEXT,
    disciplina_id UUID,
    disciplina_nome TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tp.id,
        tp.turma_id,
        tp.professor_id,
        p.nome_completo as professor_nome,
        tp.disciplina_id,
        d.nome as disciplina_nome,
        tp.created_at
    FROM turma_professores tp
    JOIN professores p ON p.id = tp.professor_id
    JOIN disciplinas d ON d.id = tp.disciplina_id
    WHERE tp.turma_id = p_turma_id
    ORDER BY d.nome, p.nome_completo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 4. FUNCTION TO BULK SYNC ASSIGNMENTS
-- This syncs turma_professores with disciplinas.professor_id
-- ============================================

CREATE OR REPLACE FUNCTION sync_disciplinas_to_turma_professores(p_turma_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_count INT := 0;
BEGIN
    -- Insert assignments for any disciplina that has a professor_id but no turma_professores entry
    INSERT INTO turma_professores (turma_id, professor_id, disciplina_id)
    SELECT d.turma_id, d.professor_id, d.id
    FROM disciplinas d
    WHERE d.turma_id = p_turma_id
      AND d.professor_id IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM turma_professores tp
          WHERE tp.turma_id = d.turma_id
            AND tp.professor_id = d.professor_id
            AND tp.disciplina_id = d.id
      )
    ON CONFLICT (turma_id, professor_id, disciplina_id) DO NOTHING;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', true,
        'synced_count', v_count,
        'message', format('%s atribuições sincronizadas', v_count)
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. TRIGGER TO AUTO-SYNC ON DISCIPLINA INSERT/UPDATE
-- ============================================

CREATE OR REPLACE FUNCTION auto_sync_turma_professores()
RETURNS TRIGGER AS $$
BEGIN
    -- When a disciplina is created or its professor_id is changed,
    -- automatically create/update the turma_professores entry
    IF NEW.professor_id IS NOT NULL THEN
        INSERT INTO turma_professores (turma_id, professor_id, disciplina_id)
        VALUES (NEW.turma_id, NEW.professor_id, NEW.id)
        ON CONFLICT (turma_id, professor_id, disciplina_id) DO NOTHING;
        
        -- If professor changed, remove old assignment
        IF TG_OP = 'UPDATE' AND OLD.professor_id IS NOT NULL AND OLD.professor_id != NEW.professor_id THEN
            DELETE FROM turma_professores
            WHERE turma_id = OLD.turma_id
              AND professor_id = OLD.professor_id
              AND disciplina_id = OLD.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS sync_turma_professores_on_disciplina ON disciplinas;
CREATE TRIGGER sync_turma_professores_on_disciplina
    AFTER INSERT OR UPDATE OF professor_id ON disciplinas
    FOR EACH ROW
    EXECUTE FUNCTION auto_sync_turma_professores();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION assign_professor_to_disciplina(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_professor_from_disciplina(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_turma_professor_assignments(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_disciplinas_to_turma_professores(UUID) TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION assign_professor_to_disciplina(UUID, UUID, UUID) IS 
'Assigns a professor to teach a specific discipline in a turma. 
Creates entry in turma_professores and updates disciplinas.professor_id.';

COMMENT ON FUNCTION remove_professor_from_disciplina(UUID, UUID, UUID) IS 
'Removes a professor assignment from a discipline in a turma.';

COMMENT ON FUNCTION get_turma_professor_assignments(UUID) IS 
'Returns all professor-discipline assignments for a given turma.';

COMMENT ON FUNCTION sync_disciplinas_to_turma_professores(UUID) IS 
'Syncs existing disciplinas.professor_id values to turma_professores table.';

COMMENT ON FUNCTION auto_sync_turma_professores() IS 
'Trigger function that automatically creates turma_professores entries when disciplinas are created/updated.';

-- ============================================
-- END OF MIGRATION
-- ============================================
