-- ============================================
-- MIGRATION: Complete Restore Escola with ALL Related Data
-- Purpose: Backup and restore ALL school data including professors, turmas, alunos, etc.
-- Date: 2026-01-03 (updated)
-- ============================================

-- ============================================
-- UPDATE BACKUP FUNCTION: Include ALL related data
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
    v_componentes JSONB;
    v_notas JSONB;
    v_notas_finais JSONB;
    v_formulas JSONB;
    v_licencas JSONB;
    v_secretarios JSONB;
    v_user_profiles JSONB;
    v_turma_professores JSONB;
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
        
        -- Componentes de avaliação (via disciplinas e turmas)
        SELECT COALESCE(jsonb_agg(to_jsonb(c.*)), '[]'::jsonb) INTO v_componentes
        FROM componentes_avaliacao c
        INNER JOIN turmas t ON t.id = c.turma_id
        WHERE t.escola_id = p_escola_id;
        
        -- Notas (via turmas)
        SELECT COALESCE(jsonb_agg(to_jsonb(n.*)), '[]'::jsonb) INTO v_notas
        FROM notas n
        INNER JOIN turmas t ON t.id = n.turma_id
        WHERE t.escola_id = p_escola_id;
        
        -- Notas finais (via turmas)
        SELECT COALESCE(jsonb_agg(to_jsonb(nf.*)), '[]'::jsonb) INTO v_notas_finais
        FROM notas_finais nf
        INNER JOIN turmas t ON t.id = nf.turma_id
        WHERE t.escola_id = p_escola_id;
        
        -- Formulas (via turmas)
        SELECT COALESCE(jsonb_agg(to_jsonb(f.*)), '[]'::jsonb) INTO v_formulas
        FROM formulas f
        INNER JOIN turmas t ON t.id = f.turma_id
        WHERE t.escola_id = p_escola_id;
        
        -- Turma-Professores associations
        SELECT COALESCE(jsonb_agg(to_jsonb(tp.*)), '[]'::jsonb) INTO v_turma_professores
        FROM turma_professores tp
        INNER JOIN turmas t ON t.id = tp.turma_id
        WHERE t.escola_id = p_escola_id;
        
        -- Licencas
        SELECT COALESCE(jsonb_agg(to_jsonb(l.*)), '[]'::jsonb) INTO v_licencas
        FROM licencas l
        WHERE l.escola_id = p_escola_id;
        
        -- Secretarios
        SELECT COALESCE(jsonb_agg(to_jsonb(s.*)), '[]'::jsonb) INTO v_secretarios
        FROM secretarios s
        WHERE s.escola_id = p_escola_id;
        
        -- User Profiles (critical for login authentication)
        SELECT COALESCE(jsonb_agg(to_jsonb(up.*)), '[]'::jsonb) INTO v_user_profiles
        FROM user_profiles up
        WHERE up.escola_id = p_escola_id;
        
        -- Build related_data JSON with ALL data
        v_related_data := jsonb_build_object(
            'professores', v_professores,
            'turmas', v_turmas,
            'alunos', v_alunos,
            'disciplinas', v_disciplinas,
            'componentes', v_componentes,
            'notas', v_notas,
            'notas_finais', v_notas_finais,
            'formulas', v_formulas,
            'turma_professores', v_turma_professores,
            'licencas', v_licencas,
            'secretarios', v_secretarios,
            'user_profiles', v_user_profiles
        );
        
        -- Create backup record
        INSERT INTO escola_backups (escola_id, escola_data, related_data, deleted_by, motivo)
        VALUES (p_escola_id, v_escola_data, v_related_data, v_user_id, p_motivo)
        RETURNING id INTO v_backup_id;
    END IF;
    
    -- Log the action BEFORE deleting
    PERFORM log_superadmin_action(
        'DELETE_ESCOLA',
        NULL,
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
            WHEN p_create_backup THEN 'Escola eliminada com backup completo criado'
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
-- UPDATE RESTORE FUNCTION: Restore ALL related data
-- ============================================
CREATE OR REPLACE FUNCTION restore_escola_from_backup(
    p_backup_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_backup RECORD;
    v_user_id UUID;
    v_new_escola_id UUID;
    v_item JSONB;
    v_professores_count INT := 0;
    v_turmas_count INT := 0;
    v_alunos_count INT := 0;
    v_disciplinas_count INT := 0;
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
    
    -- ========================================
    -- STEP 1: Restore escola
    -- ========================================
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
        user_id,
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
        COALESCE((v_backup.escola_data->'configuracoes')::JSONB, '{}'::JSONB),
        COALESCE((v_backup.escola_data->>'ativo')::BOOLEAN, true),
        false,
        NULL,
        (v_backup.escola_data->>'user_id')::UUID,
        COALESCE((v_backup.escola_data->>'created_at')::TIMESTAMP WITH TIME ZONE, NOW())
    )
    RETURNING id INTO v_new_escola_id;
    
    -- ========================================
    -- STEP 2: Restore user_profiles
    -- ========================================
    IF v_backup.related_data ? 'user_profiles' AND 
       jsonb_array_length(COALESCE(v_backup.related_data->'user_profiles', '[]'::jsonb)) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_backup.related_data->'user_profiles')
        LOOP
            INSERT INTO user_profiles (id, user_id, tipo_perfil, escola_id, ativo, metadata, created_at, updated_at)
            VALUES (
                (v_item->>'id')::UUID,
                (v_item->>'user_id')::UUID,
                v_item->>'tipo_perfil',
                v_new_escola_id,
                COALESCE((v_item->>'ativo')::BOOLEAN, true),
                COALESCE((v_item->'metadata')::JSONB, '{}'::JSONB),
                COALESCE((v_item->>'created_at')::TIMESTAMP WITH TIME ZONE, NOW()),
                NOW()
            )
            ON CONFLICT (user_id) DO UPDATE SET
                escola_id = v_new_escola_id,
                ativo = COALESCE((v_item->>'ativo')::BOOLEAN, true),
                updated_at = NOW();
        END LOOP;
    END IF;
    
    -- ========================================
    -- STEP 3: Restore professores
    -- ========================================
    IF v_backup.related_data ? 'professores' AND 
       jsonb_array_length(COALESCE(v_backup.related_data->'professores', '[]'::jsonb)) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_backup.related_data->'professores')
        LOOP
            INSERT INTO professores (id, escola_id, user_id, nome_completo, numero_agente, email, telefone, especialidade, funcoes, ativo, created_at, updated_at)
            VALUES (
                (v_item->>'id')::UUID,
                v_new_escola_id,
                (v_item->>'user_id')::UUID,
                v_item->>'nome_completo',
                v_item->>'numero_agente',
                v_item->>'email',
                v_item->>'telefone',
                v_item->>'especialidade',
                COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_item->'funcoes')), ARRAY['professor']::TEXT[]),
                COALESCE((v_item->>'ativo')::BOOLEAN, true),
                COALESCE((v_item->>'created_at')::TIMESTAMP WITH TIME ZONE, NOW()),
                NOW()
            )
            ON CONFLICT (numero_agente) DO NOTHING;
            v_professores_count := v_professores_count + 1;
        END LOOP;
    END IF;
    
    -- ========================================
    -- STEP 4: Restore turmas
    -- ========================================
    IF v_backup.related_data ? 'turmas' AND 
       jsonb_array_length(COALESCE(v_backup.related_data->'turmas', '[]'::jsonb)) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_backup.related_data->'turmas')
        LOOP
            INSERT INTO turmas (id, escola_id, professor_id, nome, codigo_turma, ano_lectivo, trimestre, nivel_ensino, sala, turno, capacidade_maxima, created_at, updated_at)
            VALUES (
                (v_item->>'id')::UUID,
                v_new_escola_id,
                (v_item->>'professor_id')::UUID,
                v_item->>'nome',
                v_item->>'codigo_turma',
                COALESCE((v_item->>'ano_lectivo')::INT, EXTRACT(YEAR FROM NOW())::INT),
                COALESCE((v_item->>'trimestre')::INT, 1),
                v_item->>'nivel_ensino',
                (v_item->>'sala')::INT,
                v_item->>'turno',
                COALESCE((v_item->>'capacidade_maxima')::INT, 40),
                COALESCE((v_item->>'created_at')::TIMESTAMP WITH TIME ZONE, NOW()),
                NOW()
            )
            ON CONFLICT (codigo_turma) DO NOTHING;
            v_turmas_count := v_turmas_count + 1;
        END LOOP;
    END IF;
    
    -- ========================================
    -- STEP 5: Restore alunos
    -- ========================================
    IF v_backup.related_data ? 'alunos' AND 
       jsonb_array_length(COALESCE(v_backup.related_data->'alunos', '[]'::jsonb)) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_backup.related_data->'alunos')
        LOOP
            INSERT INTO alunos (id, turma_id, user_id, nome_completo, numero_processo, data_nascimento, genero, nome_encarregado, telefone_encarregado, email_encarregado, endereco, ativo, created_at, updated_at)
            VALUES (
                (v_item->>'id')::UUID,
                (v_item->>'turma_id')::UUID,
                (v_item->>'user_id')::UUID,
                v_item->>'nome_completo',
                v_item->>'numero_processo',
                (v_item->>'data_nascimento')::DATE,
                v_item->>'genero',
                v_item->>'nome_encarregado',
                v_item->>'telefone_encarregado',
                v_item->>'email_encarregado',
                v_item->>'endereco',
                COALESCE((v_item->>'ativo')::BOOLEAN, true),
                COALESCE((v_item->>'created_at')::TIMESTAMP WITH TIME ZONE, NOW()),
                NOW()
            )
            ON CONFLICT (numero_processo) DO NOTHING;
            v_alunos_count := v_alunos_count + 1;
        END LOOP;
    END IF;
    
    -- ========================================
    -- STEP 6: Restore disciplinas
    -- ========================================
    IF v_backup.related_data ? 'disciplinas' AND 
       jsonb_array_length(COALESCE(v_backup.related_data->'disciplinas', '[]'::jsonb)) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_backup.related_data->'disciplinas')
        LOOP
            INSERT INTO disciplinas (id, professor_id, turma_id, nome, codigo_disciplina, carga_horaria, descricao, created_at, updated_at)
            VALUES (
                (v_item->>'id')::UUID,
                (v_item->>'professor_id')::UUID,
                (v_item->>'turma_id')::UUID,
                v_item->>'nome',
                v_item->>'codigo_disciplina',
                (v_item->>'carga_horaria')::INT,
                v_item->>'descricao',
                COALESCE((v_item->>'created_at')::TIMESTAMP WITH TIME ZONE, NOW()),
                NOW()
            )
            ON CONFLICT (turma_id, codigo_disciplina) DO NOTHING;
            v_disciplinas_count := v_disciplinas_count + 1;
        END LOOP;
    END IF;
    
    -- ========================================
    -- STEP 7: Restore componentes_avaliacao
    -- ========================================
    IF v_backup.related_data ? 'componentes' AND 
       jsonb_array_length(COALESCE(v_backup.related_data->'componentes', '[]'::jsonb)) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_backup.related_data->'componentes')
        LOOP
            INSERT INTO componentes_avaliacao (id, disciplina_id, turma_id, nome, codigo_componente, peso_percentual, escala_minima, escala_maxima, obrigatorio, ordem, descricao, created_at, updated_at)
            VALUES (
                (v_item->>'id')::UUID,
                (v_item->>'disciplina_id')::UUID,
                (v_item->>'turma_id')::UUID,
                v_item->>'nome',
                v_item->>'codigo_componente',
                COALESCE((v_item->>'peso_percentual')::NUMERIC, 0),
                COALESCE((v_item->>'escala_minima')::NUMERIC, 0),
                COALESCE((v_item->>'escala_maxima')::NUMERIC, 20),
                COALESCE((v_item->>'obrigatorio')::BOOLEAN, true),
                COALESCE((v_item->>'ordem')::INT, 1),
                v_item->>'descricao',
                COALESCE((v_item->>'created_at')::TIMESTAMP WITH TIME ZONE, NOW()),
                NOW()
            )
            ON CONFLICT (disciplina_id, codigo_componente) DO NOTHING;
        END LOOP;
    END IF;
    
    -- ========================================
    -- STEP 8: Restore notas
    -- ========================================
    IF v_backup.related_data ? 'notas' AND 
       jsonb_array_length(COALESCE(v_backup.related_data->'notas', '[]'::jsonb)) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_backup.related_data->'notas')
        LOOP
            INSERT INTO notas (id, aluno_id, componente_id, turma_id, valor, observacao, lancado_por, data_lancamento, created_at, updated_at)
            VALUES (
                (v_item->>'id')::UUID,
                (v_item->>'aluno_id')::UUID,
                (v_item->>'componente_id')::UUID,
                (v_item->>'turma_id')::UUID,
                (v_item->>'valor')::NUMERIC,
                v_item->>'observacao',
                (v_item->>'lancado_por')::UUID,
                COALESCE((v_item->>'data_lancamento')::TIMESTAMP WITH TIME ZONE, NOW()),
                COALESCE((v_item->>'created_at')::TIMESTAMP WITH TIME ZONE, NOW()),
                NOW()
            )
            ON CONFLICT (aluno_id, componente_id) DO NOTHING;
        END LOOP;
    END IF;
    
    -- ========================================
    -- STEP 9: Restore notas_finais
    -- ========================================
    IF v_backup.related_data ? 'notas_finais' AND 
       jsonb_array_length(COALESCE(v_backup.related_data->'notas_finais', '[]'::jsonb)) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_backup.related_data->'notas_finais')
        LOOP
            INSERT INTO notas_finais (id, aluno_id, turma_id, disciplina_id, trimestre, nota_final, classificacao, calculo_detalhado, data_calculo, created_at, updated_at)
            VALUES (
                (v_item->>'id')::UUID,
                (v_item->>'aluno_id')::UUID,
                (v_item->>'turma_id')::UUID,
                (v_item->>'disciplina_id')::UUID,
                (v_item->>'trimestre')::INT,
                (v_item->>'nota_final')::NUMERIC,
                v_item->>'classificacao',
                (v_item->'calculo_detalhado')::JSONB,
                COALESCE((v_item->>'data_calculo')::TIMESTAMP WITH TIME ZONE, NOW()),
                COALESCE((v_item->>'created_at')::TIMESTAMP WITH TIME ZONE, NOW()),
                NOW()
            )
            ON CONFLICT (aluno_id, turma_id, disciplina_id, trimestre) DO NOTHING;
        END LOOP;
    END IF;
    
    -- ========================================
    -- STEP 10: Restore formulas
    -- ========================================
    IF v_backup.related_data ? 'formulas' AND 
       jsonb_array_length(COALESCE(v_backup.related_data->'formulas', '[]'::jsonb)) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_backup.related_data->'formulas')
        LOOP
            INSERT INTO formulas (id, turma_id, disciplina_id, expressao, componentes_usados, validada, mensagem_validacao, created_at, updated_at)
            VALUES (
                (v_item->>'id')::UUID,
                (v_item->>'turma_id')::UUID,
                (v_item->>'disciplina_id')::UUID,
                v_item->>'expressao',
                COALESCE((v_item->'componentes_usados')::JSONB, '[]'::JSONB),
                COALESCE((v_item->>'validada')::BOOLEAN, false),
                v_item->>'mensagem_validacao',
                COALESCE((v_item->>'created_at')::TIMESTAMP WITH TIME ZONE, NOW()),
                NOW()
            )
            ON CONFLICT (turma_id, disciplina_id) DO NOTHING;
        END LOOP;
    END IF;
    
    -- ========================================
    -- STEP 11: Restore turma_professores
    -- ========================================
    IF v_backup.related_data ? 'turma_professores' AND 
       jsonb_array_length(COALESCE(v_backup.related_data->'turma_professores', '[]'::jsonb)) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_backup.related_data->'turma_professores')
        LOOP
            INSERT INTO turma_professores (id, turma_id, professor_id, disciplina_id, is_diretor, ativo, created_at, updated_at)
            VALUES (
                (v_item->>'id')::UUID,
                (v_item->>'turma_id')::UUID,
                (v_item->>'professor_id')::UUID,
                (v_item->>'disciplina_id')::UUID,
                COALESCE((v_item->>'is_diretor')::BOOLEAN, false),
                COALESCE((v_item->>'ativo')::BOOLEAN, true),
                COALESCE((v_item->>'created_at')::TIMESTAMP WITH TIME ZONE, NOW()),
                NOW()
            )
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
    
    -- ========================================
    -- STEP 12: Restore secretarios
    -- ========================================
    IF v_backup.related_data ? 'secretarios' AND 
       jsonb_array_length(COALESCE(v_backup.related_data->'secretarios', '[]'::jsonb)) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_backup.related_data->'secretarios')
        LOOP
            INSERT INTO secretarios (id, escola_id, user_id, nome_completo, email, telefone, ativo, created_at, updated_at)
            VALUES (
                (v_item->>'id')::UUID,
                v_new_escola_id,
                (v_item->>'user_id')::UUID,
                v_item->>'nome_completo',
                v_item->>'email',
                v_item->>'telefone',
                COALESCE((v_item->>'ativo')::BOOLEAN, true),
                COALESCE((v_item->>'created_at')::TIMESTAMP WITH TIME ZONE, NOW()),
                NOW()
            )
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
    
    -- ========================================
    -- STEP 13: Restore licencas
    -- ========================================
    IF v_backup.related_data ? 'licencas' AND 
       jsonb_array_length(COALESCE(v_backup.related_data->'licencas', '[]'::jsonb)) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_backup.related_data->'licencas')
        LOOP
            INSERT INTO licencas (id, escola_id, tipo_plano, data_inicio, data_fim, valor, metodo_pagamento, referencia_pagamento, comprovativo_url, estado, ativada_por, ativada_em, observacoes, created_at, updated_at)
            VALUES (
                (v_item->>'id')::UUID,
                v_new_escola_id,
                v_item->>'tipo_plano',
                (v_item->>'data_inicio')::DATE,
                (v_item->>'data_fim')::DATE,
                (v_item->>'valor')::NUMERIC,
                v_item->>'metodo_pagamento',
                v_item->>'referencia_pagamento',
                v_item->>'comprovativo_url',
                COALESCE(v_item->>'estado', 'pendente'),
                (v_item->>'ativada_por')::UUID,
                (v_item->>'ativada_em')::TIMESTAMP WITH TIME ZONE,
                v_item->>'observacoes',
                COALESCE((v_item->>'created_at')::TIMESTAMP WITH TIME ZONE, NOW()),
                NOW()
            )
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
    
    -- ========================================
    -- Mark backup as restored
    -- ========================================
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
            'original_deleted_at', v_backup.deleted_at,
            'professores_restored', v_professores_count,
            'turmas_restored', v_turmas_count,
            'alunos_restored', v_alunos_count,
            'disciplinas_restored', v_disciplinas_count
        )
    );
    
    RETURN json_build_object(
        'success', true,
        'escola_id', v_new_escola_id,
        'message', format('Escola restaurada com sucesso! Dados restaurados: %s professores, %s turmas, %s alunos, %s disciplinas.', 
            v_professores_count, v_turmas_count, v_alunos_count, v_disciplinas_count)
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- END OF MIGRATION
-- ============================================
