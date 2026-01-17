-- ============================================
-- MIGRATION: Templates Sync Functions
-- Purpose: Functions and triggers for automatic synchronization
--          of templates to linked turmas
-- Date: 2026-01-16
-- ============================================

-- ============================================
-- FUNCTION: apply_template_to_turma
-- Applies a discipline template to a turma, creating the discipline
-- and all its components
-- ============================================

CREATE OR REPLACE FUNCTION apply_template_to_turma(
    p_turma_id UUID,
    p_template_id UUID,
    p_professor_id UUID
) RETURNS UUID AS $$
DECLARE
    v_disciplina_id UUID;
    v_template RECORD;
    v_componente RECORD;
    v_turma_escola_id UUID;
    v_template_escola_id UUID;
BEGIN
    -- Validate that turma and template belong to the same school
    SELECT escola_id INTO v_turma_escola_id FROM turmas WHERE id = p_turma_id;
    SELECT escola_id INTO v_template_escola_id FROM disciplinas_template WHERE id = p_template_id;
    
    IF v_turma_escola_id IS NULL THEN
        RAISE EXCEPTION 'Turma not found: %', p_turma_id;
    END IF;
    
    IF v_template_escola_id IS NULL THEN
        RAISE EXCEPTION 'Template not found: %', p_template_id;
    END IF;
    
    IF v_turma_escola_id != v_template_escola_id THEN
        RAISE EXCEPTION 'Template and turma must belong to the same school';
    END IF;
    
    -- Check if template is already applied to this turma
    IF EXISTS (SELECT 1 FROM turma_template_link WHERE turma_id = p_turma_id AND disciplina_template_id = p_template_id) THEN
        RAISE EXCEPTION 'Template already applied to this turma';
    END IF;
    
    -- Get template details
    SELECT * INTO v_template FROM disciplinas_template WHERE id = p_template_id;
    
    -- Create discipline in the turma
    INSERT INTO disciplinas (
        professor_id, 
        turma_id, 
        nome, 
        codigo_disciplina, 
        carga_horaria, 
        descricao, 
        ordem
    )
    VALUES (
        p_professor_id, 
        p_turma_id, 
        v_template.nome, 
        v_template.codigo_disciplina, 
        v_template.carga_horaria, 
        v_template.descricao, 
        v_template.ordem
    )
    RETURNING id INTO v_disciplina_id;
    
    -- Create all components from the template
    FOR v_componente IN 
        SELECT * FROM componentes_template 
        WHERE disciplina_template_id = p_template_id 
        ORDER BY trimestre, ordem
    LOOP
        INSERT INTO componentes_avaliacao (
            disciplina_id, 
            turma_id, 
            nome, 
            codigo_componente, 
            peso_percentual,
            escala_minima, 
            escala_maxima, 
            obrigatorio, 
            ordem, 
            descricao,
            trimestre, 
            is_calculated, 
            formula_expression, 
            depends_on_components,
            tipo_calculo
        ) VALUES (
            v_disciplina_id, 
            p_turma_id, 
            v_componente.nome, 
            v_componente.codigo_componente,
            v_componente.peso_percentual, 
            v_componente.escala_minima, 
            v_componente.escala_maxima,
            v_componente.obrigatorio, 
            v_componente.ordem, 
            v_componente.descricao,
            v_componente.trimestre, 
            v_componente.is_calculated, 
            v_componente.formula_expression,
            v_componente.depends_on_components,
            v_componente.tipo_calculo
        );
    END LOOP;
    
    -- Create the link between turma and template
    INSERT INTO turma_template_link (turma_id, disciplina_template_id, disciplina_id)
    VALUES (p_turma_id, p_template_id, v_disciplina_id);
    
    -- If template is marked as obrigatoria, also add to disciplinas_obrigatorias
    IF v_template.is_obrigatoria THEN
        INSERT INTO disciplinas_obrigatorias (turma_id, disciplina_id, is_obrigatoria)
        VALUES (p_turma_id, v_disciplina_id, true)
        ON CONFLICT (turma_id, disciplina_id) DO NOTHING;
    END IF;
    
    RETURN v_disciplina_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION apply_template_to_turma IS 'Applies a discipline template to a turma, creating the discipline and all its components';

-- ============================================
-- FUNCTION: apply_all_class_templates_to_turma
-- Applies all templates for a specific class to a turma
-- ============================================

CREATE OR REPLACE FUNCTION apply_all_class_templates_to_turma(
    p_turma_id UUID,
    p_classe TEXT,
    p_professor_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_template RECORD;
    v_count INTEGER := 0;
    v_escola_id UUID;
BEGIN
    -- Get school from turma
    SELECT escola_id INTO v_escola_id FROM turmas WHERE id = p_turma_id;
    
    IF v_escola_id IS NULL THEN
        RAISE EXCEPTION 'Turma not found: %', p_turma_id;
    END IF;
    
    -- Apply each template for this class
    FOR v_template IN 
        SELECT id FROM disciplinas_template 
        WHERE escola_id = v_escola_id AND classe = p_classe
        ORDER BY ordem
    LOOP
        -- Skip if already applied
        IF NOT EXISTS (SELECT 1 FROM turma_template_link WHERE turma_id = p_turma_id AND disciplina_template_id = v_template.id) THEN
            PERFORM apply_template_to_turma(p_turma_id, v_template.id, p_professor_id);
            v_count := v_count + 1;
        END IF;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION apply_all_class_templates_to_turma IS 'Applies all templates for a specific class to a turma';

-- ============================================
-- FUNCTION: unlink_template_from_turma
-- Removes the link between a turma and a template (discipline remains but is no longer synced)
-- ============================================

CREATE OR REPLACE FUNCTION unlink_template_from_turma(
    p_turma_id UUID,
    p_template_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM turma_template_link 
    WHERE turma_id = p_turma_id AND disciplina_template_id = p_template_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION unlink_template_from_turma IS 'Removes the sync link between a turma and a template (discipline remains but is no longer synchronized)';

-- ============================================
-- TRIGGER FUNCTION: sync_disciplina_template_changes
-- When a discipline template is updated, sync changes to all linked turmas
-- ============================================

CREATE OR REPLACE FUNCTION sync_disciplina_template_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all linked disciplines
    UPDATE disciplinas d
    SET 
        nome = NEW.nome,
        codigo_disciplina = NEW.codigo_disciplina,
        carga_horaria = NEW.carga_horaria,
        descricao = NEW.descricao,
        ordem = NEW.ordem,
        updated_at = NOW()
    FROM turma_template_link ttl
    WHERE ttl.disciplina_id = d.id
    AND ttl.disciplina_template_id = NEW.id;
    
    -- Update sync timestamp
    UPDATE turma_template_link
    SET sincronizado_em = NOW()
    WHERE disciplina_template_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_sync_disciplina_template ON disciplinas_template;
CREATE TRIGGER trigger_sync_disciplina_template
    AFTER UPDATE ON disciplinas_template
    FOR EACH ROW
    EXECUTE FUNCTION sync_disciplina_template_changes();

-- ============================================
-- TRIGGER FUNCTION: sync_componente_template_changes
-- When a component template is updated, sync changes to all linked turmas
-- ============================================

CREATE OR REPLACE FUNCTION sync_componente_template_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all linked components
    -- Match by codigo_componente and trimestre since component IDs are different
    UPDATE componentes_avaliacao ca
    SET 
        nome = NEW.nome,
        peso_percentual = NEW.peso_percentual,
        escala_minima = NEW.escala_minima,
        escala_maxima = NEW.escala_maxima,
        obrigatorio = NEW.obrigatorio,
        ordem = NEW.ordem,
        descricao = NEW.descricao,
        is_calculated = NEW.is_calculated,
        formula_expression = NEW.formula_expression,
        depends_on_components = NEW.depends_on_components,
        tipo_calculo = NEW.tipo_calculo,
        updated_at = NOW()
    FROM turma_template_link ttl
    WHERE ca.disciplina_id = ttl.disciplina_id
    AND ttl.disciplina_template_id = NEW.disciplina_template_id
    AND ca.codigo_componente = OLD.codigo_componente
    AND ca.trimestre = OLD.trimestre;
    
    -- Also update codigo_componente if it changed
    IF OLD.codigo_componente != NEW.codigo_componente THEN
        UPDATE componentes_avaliacao ca
        SET codigo_componente = NEW.codigo_componente
        FROM turma_template_link ttl
        WHERE ca.disciplina_id = ttl.disciplina_id
        AND ttl.disciplina_template_id = NEW.disciplina_template_id
        AND ca.codigo_componente = OLD.codigo_componente
        AND ca.trimestre = OLD.trimestre;
    END IF;
    
    -- Update sync timestamp
    UPDATE turma_template_link
    SET sincronizado_em = NOW()
    WHERE disciplina_template_id = NEW.disciplina_template_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_sync_componente_template ON componentes_template;
CREATE TRIGGER trigger_sync_componente_template
    AFTER UPDATE ON componentes_template
    FOR EACH ROW
    EXECUTE FUNCTION sync_componente_template_changes();

-- ============================================
-- TRIGGER FUNCTION: sync_new_componente_template
-- When a new component is added to a template, add it to all linked turmas
-- ============================================

CREATE OR REPLACE FUNCTION sync_new_componente_template()
RETURNS TRIGGER AS $$
DECLARE
    v_link RECORD;
BEGIN
    -- Add the new component to all linked disciplines
    FOR v_link IN 
        SELECT ttl.disciplina_id, ttl.turma_id 
        FROM turma_template_link ttl
        WHERE ttl.disciplina_template_id = NEW.disciplina_template_id
    LOOP
        INSERT INTO componentes_avaliacao (
            disciplina_id, 
            turma_id, 
            nome, 
            codigo_componente, 
            peso_percentual,
            escala_minima, 
            escala_maxima, 
            obrigatorio, 
            ordem, 
            descricao,
            trimestre, 
            is_calculated, 
            formula_expression, 
            depends_on_components,
            tipo_calculo
        ) VALUES (
            v_link.disciplina_id, 
            v_link.turma_id, 
            NEW.nome, 
            NEW.codigo_componente,
            NEW.peso_percentual, 
            NEW.escala_minima, 
            NEW.escala_maxima,
            NEW.obrigatorio, 
            NEW.ordem, 
            NEW.descricao,
            NEW.trimestre, 
            NEW.is_calculated, 
            NEW.formula_expression,
            NEW.depends_on_components,
            NEW.tipo_calculo
        )
        ON CONFLICT (disciplina_id, turma_id, codigo_componente, trimestre) DO NOTHING;
    END LOOP;
    
    -- Update sync timestamp
    UPDATE turma_template_link
    SET sincronizado_em = NOW()
    WHERE disciplina_template_id = NEW.disciplina_template_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_sync_new_componente_template ON componentes_template;
CREATE TRIGGER trigger_sync_new_componente_template
    AFTER INSERT ON componentes_template
    FOR EACH ROW
    EXECUTE FUNCTION sync_new_componente_template();

-- ============================================
-- TRIGGER FUNCTION: sync_deleted_componente_template
-- When a component is deleted from a template, delete it from all linked turmas
-- (only if no grades exist for that component)
-- ============================================

CREATE OR REPLACE FUNCTION sync_deleted_componente_template()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete components from linked turmas only if they have no grades
    DELETE FROM componentes_avaliacao ca
    USING turma_template_link ttl
    WHERE ca.disciplina_id = ttl.disciplina_id
    AND ttl.disciplina_template_id = OLD.disciplina_template_id
    AND ca.codigo_componente = OLD.codigo_componente
    AND ca.trimestre = OLD.trimestre
    AND NOT EXISTS (
        SELECT 1 FROM notas n WHERE n.componente_id = ca.id
    );
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_sync_deleted_componente_template ON componentes_template;
CREATE TRIGGER trigger_sync_deleted_componente_template
    AFTER DELETE ON componentes_template
    FOR EACH ROW
    EXECUTE FUNCTION sync_deleted_componente_template();

-- ============================================
-- FUNCTION: get_templates_for_class
-- Get all templates for a specific class and school
-- ============================================

CREATE OR REPLACE FUNCTION get_templates_for_class(
    p_escola_id UUID,
    p_classe TEXT
) RETURNS TABLE (
    id UUID,
    nome TEXT,
    codigo_disciplina TEXT,
    carga_horaria INTEGER,
    descricao TEXT,
    ordem INTEGER,
    is_obrigatoria BOOLEAN,
    componentes_count BIGINT,
    turmas_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dt.id,
        dt.nome,
        dt.codigo_disciplina,
        dt.carga_horaria,
        dt.descricao,
        dt.ordem,
        dt.is_obrigatoria,
        COUNT(DISTINCT ct.id) as componentes_count,
        COUNT(DISTINCT ttl.turma_id) as turmas_count
    FROM disciplinas_template dt
    LEFT JOIN componentes_template ct ON ct.disciplina_template_id = dt.id
    LEFT JOIN turma_template_link ttl ON ttl.disciplina_template_id = dt.id
    WHERE dt.escola_id = p_escola_id AND dt.classe = p_classe
    GROUP BY dt.id, dt.nome, dt.codigo_disciplina, dt.carga_horaria, dt.descricao, dt.ordem, dt.is_obrigatoria
    ORDER BY dt.ordem, dt.nome;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_templates_for_class IS 'Get all templates for a specific class and school with counts';

-- ============================================
-- FUNCTION: get_available_classes
-- Get list of classes that have templates defined
-- ============================================

CREATE OR REPLACE FUNCTION get_available_template_classes(
    p_escola_id UUID
) RETURNS TABLE (
    classe TEXT,
    templates_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dt.classe,
        COUNT(*) as templates_count
    FROM disciplinas_template dt
    WHERE dt.escola_id = p_escola_id
    GROUP BY dt.classe
    ORDER BY dt.classe;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_available_template_classes IS 'Get list of classes that have templates defined for a school';

-- ============================================
-- GRANT RPC PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION apply_template_to_turma TO authenticated;
GRANT EXECUTE ON FUNCTION apply_all_class_templates_to_turma TO authenticated;
GRANT EXECUTE ON FUNCTION unlink_template_from_turma TO authenticated;
GRANT EXECUTE ON FUNCTION get_templates_for_class TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_template_classes TO authenticated;
