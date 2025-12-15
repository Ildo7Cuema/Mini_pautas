-- ============================================
-- MIGRATION: Add RPC function for updating discipline order
-- Date: 2025-12-14
-- Purpose: Allow users who can see disciplines to update their order
-- This bypasses RLS policies for the specific case of reordering
-- ============================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS update_disciplina_ordem(UUID, INTEGER);

-- Create a function that updates the ordem field for disciplines
-- This function runs with SECURITY DEFINER to bypass RLS
-- The validation is: if you can see the discipline (via SELECT RLS), you can reorder it
-- We verify this by checking if the discipline exists and belongs to a turma the user can access

CREATE OR REPLACE FUNCTION update_disciplina_ordem(
    p_disciplina_id UUID,
    p_nova_ordem INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_turma_id UUID;
    v_escola_id UUID;
    v_can_access BOOLEAN := FALSE;
    v_current_user_id UUID;
BEGIN
    -- Get current user ID
    v_current_user_id := auth.uid();
    
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;

    -- Get the turma_id and escola_id for this disciplina
    SELECT d.turma_id, t.escola_id INTO v_turma_id, v_escola_id
    FROM disciplinas d
    JOIN turmas t ON t.id = d.turma_id
    WHERE d.id = p_disciplina_id;

    IF v_turma_id IS NULL THEN
        RAISE EXCEPTION 'Disciplina não encontrada: %', p_disciplina_id;
    END IF;

    -- Method 1: User is the escola that owns this turma
    SELECT EXISTS (
        SELECT 1 FROM escolas e
        WHERE e.id = v_escola_id
        AND e.user_id = v_current_user_id
    ) INTO v_can_access;

    IF v_can_access THEN
        RAISE NOTICE 'Access granted: user is escola owner';
    END IF;

    -- Method 2: User is a professor who created this turma (professor_id)
    IF NOT v_can_access THEN
        SELECT EXISTS (
            SELECT 1 FROM turmas t
            JOIN professores p ON p.id = t.professor_id
            WHERE t.id = v_turma_id
            AND p.user_id = v_current_user_id
        ) INTO v_can_access;
        
        IF v_can_access THEN
            RAISE NOTICE 'Access granted: user is turma professor';
        END IF;
    END IF;

    -- Method 3: User is assigned to this turma via turma_professores
    IF NOT v_can_access THEN
        SELECT EXISTS (
            SELECT 1 FROM turma_professores tp
            JOIN professores p ON p.id = tp.professor_id
            WHERE tp.turma_id = v_turma_id
            AND p.user_id = v_current_user_id
        ) INTO v_can_access;
        
        IF v_can_access THEN
            RAISE NOTICE 'Access granted: user is assigned professor';
        END IF;
    END IF;

    -- Method 4: User is a professor who owns this discipline directly (disciplina.professor_id)
    IF NOT v_can_access THEN
        SELECT EXISTS (
            SELECT 1 FROM disciplinas d
            JOIN professores p ON p.id = d.professor_id
            WHERE d.id = p_disciplina_id
            AND p.user_id = v_current_user_id
        ) INTO v_can_access;
        
        IF v_can_access THEN
            RAISE NOTICE 'Access granted: user is discipline professor';
        END IF;
    END IF;

    -- Method 5: User is assigned to this specific discipline via turma_professores.disciplina_id
    IF NOT v_can_access THEN
        SELECT EXISTS (
            SELECT 1 FROM turma_professores tp
            JOIN professores p ON p.id = tp.professor_id
            WHERE tp.disciplina_id = p_disciplina_id
            AND p.user_id = v_current_user_id
        ) INTO v_can_access;
        
        IF v_can_access THEN
            RAISE NOTICE 'Access granted: user is assigned to discipline';
        END IF;
    END IF;

    IF NOT v_can_access THEN
        -- Log debug info
        RAISE NOTICE 'Access denied for user % on disciplina % (turma: %, escola: %)', 
            v_current_user_id, p_disciplina_id, v_turma_id, v_escola_id;
        RAISE EXCEPTION 'Sem permissão para atualizar esta disciplina';
    END IF;

    -- Update the ordem
    UPDATE disciplinas
    SET ordem = p_nova_ordem
    WHERE id = p_disciplina_id;

    RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_disciplina_ordem(UUID, INTEGER) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION update_disciplina_ordem IS 'Updates the ordem field for a discipline. Validates access based on user role (Escola owner or Professor with access to the turma/discipline).';
