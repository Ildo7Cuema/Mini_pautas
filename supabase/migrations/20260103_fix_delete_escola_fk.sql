-- ============================================
-- FIX: Update backup_and_delete_escola function
-- Moves log_superadmin_action to BEFORE delete
-- to avoid foreign key constraint violation
-- ============================================

CREATE OR REPLACE FUNCTION backup_and_delete_escola(
    p_escola_id UUID,
    p_motivo TEXT,
    p_create_backup BOOLEAN DEFAULT true
)
RETURNS JSON AS $$
DECLARE
    v_escola_data JSONB;
    v_related_data JSONB;
    v_backup_id UUID;
    v_user_id UUID;
    v_professores JSONB;
    v_turmas JSONB;
    v_alunos JSONB;
    v_disciplinas JSONB;
    v_licencas JSONB;
    v_secretarios JSONB;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    -- Check if user is SUPERADMIN
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = v_user_id
        AND tipo_perfil = 'SUPERADMIN'
        AND ativo = true
    ) THEN
        RAISE EXCEPTION 'Apenas SUPERADMIN pode eliminar escolas';
    END IF;
    
    -- Check if escola exists
    IF NOT EXISTS (SELECT 1 FROM escolas WHERE id = p_escola_id) THEN
        RAISE EXCEPTION 'Escola não encontrada';
    END IF;
    
    -- Get escola data
    SELECT to_jsonb(e.*) INTO v_escola_data
    FROM escolas e
    WHERE e.id = p_escola_id;
    
    IF p_create_backup THEN
        -- Get all related data for backup
        
        -- Professores
        SELECT COALESCE(jsonb_agg(to_jsonb(p.*)), '[]'::jsonb) INTO v_professores
        FROM professores p
        WHERE p.escola_id = p_escola_id;
        
        -- Turmas
        SELECT COALESCE(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_turmas
        FROM turmas t
        WHERE t.escola_id = p_escola_id;
        
        -- Alunos (via turmas)
        SELECT COALESCE(jsonb_agg(to_jsonb(a.*)), '[]'::jsonb) INTO v_alunos
        FROM alunos a
        INNER JOIN turmas t ON t.id = a.turma_id
        WHERE t.escola_id = p_escola_id;
        
        -- Disciplinas (via turmas)
        SELECT COALESCE(jsonb_agg(to_jsonb(d.*)), '[]'::jsonb) INTO v_disciplinas
        FROM disciplinas d
        INNER JOIN turmas t ON t.id = d.turma_id
        WHERE t.escola_id = p_escola_id;
        
        -- Licencas
        SELECT COALESCE(jsonb_agg(to_jsonb(l.*)), '[]'::jsonb) INTO v_licencas
        FROM licencas l
        WHERE l.escola_id = p_escola_id;
        
        -- Secretarios
        SELECT COALESCE(jsonb_agg(to_jsonb(s.*)), '[]'::jsonb) INTO v_secretarios
        FROM secretarios s
        WHERE s.escola_id = p_escola_id;
        
        -- Build related_data JSON
        v_related_data := jsonb_build_object(
            'professores', v_professores,
            'turmas', v_turmas,
            'alunos', v_alunos,
            'disciplinas', v_disciplinas,
            'licencas', v_licencas,
            'secretarios', v_secretarios
        );
        
        -- Create backup record
        INSERT INTO escola_backups (escola_id, escola_data, related_data, deleted_by, motivo)
        VALUES (p_escola_id, v_escola_data, v_related_data, v_user_id, p_motivo)
        RETURNING id INTO v_backup_id;
    END IF;
    
    -- Log the action BEFORE deleting (to avoid foreign key constraint violation)
    -- Pass NULL as escola_id since the escola will be deleted
    PERFORM log_superadmin_action(
        'DELETE_ESCOLA',
        NULL,  -- Use NULL because escola will be deleted
        jsonb_build_object(
            'escola_id', p_escola_id,
            'escola_nome', v_escola_data->>'nome',
            'escola_codigo', v_escola_data->>'codigo_escola',
            'motivo', p_motivo,
            'backup_created', p_create_backup,
            'backup_id', v_backup_id
        )
    );
    
    -- Delete escola (CASCADE will delete related records)
    DELETE FROM escolas WHERE id = p_escola_id;
    
    RETURN json_build_object(
        'success', true,
        'backup_id', v_backup_id,
        'message', CASE 
            WHEN p_create_backup THEN 'Escola eliminada com backup criado'
            ELSE 'Escola eliminada sem backup'
        END
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
