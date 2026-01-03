-- ============================================
-- ADD ESCOLA BACKUP AND DELETE FUNCTIONALITY
-- For SuperAdmin to delete schools with backup
-- ============================================

-- Create escola_backups table to store deleted school data
CREATE TABLE IF NOT EXISTS escola_backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escola_id UUID NOT NULL,
    escola_data JSONB NOT NULL,
    related_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    deleted_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    motivo TEXT NOT NULL,
    restored_at TIMESTAMP WITH TIME ZONE,
    restored_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_escola_backups_escola_id ON escola_backups(escola_id);
CREATE INDEX IF NOT EXISTS idx_escola_backups_deleted_at ON escola_backups(deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_escola_backups_deleted_by ON escola_backups(deleted_by);

-- Enable RLS
ALTER TABLE escola_backups ENABLE ROW LEVEL SECURITY;

-- Policy: Only SUPERADMIN can read/write backups
CREATE POLICY "SUPERADMIN can manage escola_backups"
    ON escola_backups FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND tipo_perfil = 'SUPERADMIN'
            AND ativo = true
        )
    );

-- ============================================
-- FUNCTION: Backup and delete escola
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
    
    -- Delete escola (CASCADE will delete related records)
    DELETE FROM escolas WHERE id = p_escola_id;
    
    -- Log the action
    PERFORM log_superadmin_action(
        'DELETE_ESCOLA',
        p_escola_id,
        jsonb_build_object(
            'escola_nome', v_escola_data->>'nome',
            'escola_codigo', v_escola_data->>'codigo_escola',
            'motivo', p_motivo,
            'backup_created', p_create_backup,
            'backup_id', v_backup_id
        )
    );
    
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

-- ============================================
-- FUNCTION: Restore escola from backup
-- ============================================
CREATE OR REPLACE FUNCTION restore_escola_from_backup(
    p_backup_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_backup RECORD;
    v_user_id UUID;
    v_escola_id UUID;
    v_new_escola_id UUID;
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
        RAISE EXCEPTION 'Apenas SUPERADMIN pode restaurar escolas';
    END IF;
    
    -- Get backup data
    SELECT * INTO v_backup
    FROM escola_backups
    WHERE id = p_backup_id
    AND restored_at IS NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Backup não encontrado ou já restaurado';
    END IF;
    
    -- Check if escola with same codigo already exists
    IF EXISTS (
        SELECT 1 FROM escolas
        WHERE codigo_escola = v_backup.escola_data->>'codigo_escola'
    ) THEN
        RAISE EXCEPTION 'Já existe uma escola com o código %', v_backup.escola_data->>'codigo_escola';
    END IF;
    
    -- Restore escola
    INSERT INTO escolas (
        id,
        nome,
        codigo_escola,
        provincia,
        municipio,
        endereco,
        telefone,
        email,
        configuracoes,
        ativo,
        bloqueado,
        bloqueado_motivo,
        created_at
    )
    VALUES (
        (v_backup.escola_data->>'id')::UUID,
        v_backup.escola_data->>'nome',
        v_backup.escola_data->>'codigo_escola',
        v_backup.escola_data->>'provincia',
        v_backup.escola_data->>'municipio',
        v_backup.escola_data->>'endereco',
        v_backup.escola_data->>'telefone',
        v_backup.escola_data->>'email',
        (v_backup.escola_data->'configuracoes')::JSONB,
        COALESCE((v_backup.escola_data->>'ativo')::BOOLEAN, true),
        false, -- Reset bloqueado status
        NULL,
        COALESCE((v_backup.escola_data->>'created_at')::TIMESTAMP WITH TIME ZONE, NOW())
    )
    RETURNING id INTO v_new_escola_id;
    
    -- Mark backup as restored
    UPDATE escola_backups
    SET restored_at = NOW(),
        restored_by = v_user_id
    WHERE id = p_backup_id;
    
    -- Log the action
    PERFORM log_superadmin_action(
        'RESTORE_ESCOLA',
        v_new_escola_id,
        jsonb_build_object(
            'escola_nome', v_backup.escola_data->>'nome',
            'escola_codigo', v_backup.escola_data->>'codigo_escola',
            'backup_id', p_backup_id,
            'original_deleted_at', v_backup.deleted_at
        )
    );
    
    RETURN json_build_object(
        'success', true,
        'escola_id', v_new_escola_id,
        'message', 'Escola restaurada com sucesso. Nota: Professores, turmas e alunos não foram restaurados automaticamente.'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Fetch escola backups
-- ============================================
CREATE OR REPLACE FUNCTION fetch_escola_backups(
    p_limit INTEGER DEFAULT 50,
    p_include_restored BOOLEAN DEFAULT false
)
RETURNS SETOF escola_backups AS $$
BEGIN
    -- Check if user is SUPERADMIN
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND tipo_perfil = 'SUPERADMIN'
        AND ativo = true
    ) THEN
        RAISE EXCEPTION 'Apenas SUPERADMIN pode ver backups';
    END IF;
    
    RETURN QUERY
    SELECT *
    FROM escola_backups
    WHERE (p_include_restored OR restored_at IS NULL)
    ORDER BY deleted_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION backup_and_delete_escola(UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_escola_from_backup(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fetch_escola_backups(INTEGER, BOOLEAN) TO authenticated;
