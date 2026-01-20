-- ============================================
-- MIGRATION: Fix ON CONFLICT in apply_template_to_turma
-- Purpose: Use explicit existence check instead of ON CONFLICT 
--          to avoid constraint matching errors
-- Date: 2026-01-20
-- ============================================

-- ============================================
-- FUNCTION: apply_template_to_turma (Fixed)
-- Uses IF NOT EXISTS check instead of ON CONFLICT
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
    v_componente_catalogo_id UUID;
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
    
    -- Create all components from the template using the catalog
    FOR v_componente IN 
        SELECT * FROM componentes_template 
        WHERE disciplina_template_id = p_template_id 
        ORDER BY trimestre, ordem
    LOOP
        -- Get or create component in catalog
        v_componente_catalogo_id := get_or_create_componente_catalogo(
            v_turma_escola_id,
            v_componente.codigo_componente,
            v_componente.nome,
            v_componente.peso_percentual,
            v_componente.escala_minima,
            v_componente.escala_maxima,
            v_componente.is_calculated,
            v_componente.formula_expression,
            -- Convert depends_on_components to codes (JSONB array to text[])
            COALESCE(
                (
                    SELECT array_agg(ct2.codigo_componente)
                    FROM componentes_template ct2
                    WHERE ct2.id::text IN (
                        SELECT jsonb_array_elements_text(
                            CASE 
                                WHEN v_componente.depends_on_components IS NULL THEN '[]'::jsonb
                                WHEN jsonb_typeof(v_componente.depends_on_components) = 'array' THEN v_componente.depends_on_components
                                ELSE '[]'::jsonb
                            END
                        )
                    )
                ),
                '{}'::text[]
            ),
            v_componente.tipo_calculo,
            v_componente.descricao
        );
        
        -- Associate to disciplina
        PERFORM associate_componente_to_disciplina(
            v_disciplina_id,
            v_componente_catalogo_id,
            v_componente.trimestre,
            v_componente.peso_percentual,
            v_componente.ordem,
            v_componente.obrigatorio
        );
        
        -- Also create in componentes_avaliacao for backwards compatibility
        -- Use explicit existence check instead of ON CONFLICT to avoid constraint errors
        IF NOT EXISTS (
            SELECT 1 FROM componentes_avaliacao 
            WHERE disciplina_id = v_disciplina_id 
            AND codigo_componente = v_componente.codigo_componente
        ) THEN
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
        END IF;
    END LOOP;
    
    -- Create the link between turma and template
    INSERT INTO turma_template_link (turma_id, disciplina_template_id, disciplina_id)
    VALUES (p_turma_id, p_template_id, v_disciplina_id);
    
    -- If template is marked as obrigatoria, also add to disciplinas_obrigatorias
    IF v_template.is_obrigatoria THEN
        IF NOT EXISTS (
            SELECT 1 FROM disciplinas_obrigatorias 
            WHERE turma_id = p_turma_id 
            AND disciplina_id = v_disciplina_id
        ) THEN
            INSERT INTO disciplinas_obrigatorias (turma_id, disciplina_id, is_obrigatoria)
            VALUES (p_turma_id, v_disciplina_id, true);
        END IF;
    END IF;
    
    RETURN v_disciplina_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION apply_template_to_turma IS 'Applies a discipline template to a turma, creating the discipline and all its components. Fixed to use IF NOT EXISTS instead of ON CONFLICT.';
