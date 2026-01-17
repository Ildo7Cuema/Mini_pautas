-- Fix sync_new_componente_template trigger function to avoid ON CONFLICT error
-- Replaces the function definition
CREATE OR REPLACE FUNCTION sync_new_componente_template()
RETURNS TRIGGER AS $$
DECLARE
    v_link RECORD;
    v_escola_id UUID;
    v_componente_catalogo_id UUID;
BEGIN
    -- Add the new component to all linked disciplines
    FOR v_link IN 
        SELECT ttl.disciplina_id, ttl.turma_id, t.escola_id
        FROM turma_template_link ttl
        JOIN turmas t ON ttl.turma_id = t.id
        WHERE ttl.disciplina_template_id = NEW.disciplina_template_id
    LOOP
        -- Get or create in catalog
        v_componente_catalogo_id := get_or_create_componente_catalogo(
            v_link.escola_id,
            NEW.codigo_componente,
            NEW.nome,
            NEW.peso_percentual,
            NEW.escala_minima,
            NEW.escala_maxima,
            NEW.is_calculated,
            NEW.formula_expression,
            COALESCE(
                (
                    SELECT array_agg(ct2.codigo_componente)
                    FROM componentes_template ct2
                    WHERE ct2.id::text IN (
                        SELECT jsonb_array_elements_text(
                            CASE 
                                WHEN NEW.depends_on_components IS NULL THEN '[]'::jsonb
                                WHEN jsonb_typeof(NEW.depends_on_components) = 'array' THEN NEW.depends_on_components
                                ELSE '[]'::jsonb
                            END
                        )
                    )
                ),
                '{}'::text[]
            ),
            NEW.tipo_calculo,
            NEW.descricao
        );
        
        -- Associate to disciplina
        PERFORM associate_componente_to_disciplina(
            v_link.disciplina_id,
            v_componente_catalogo_id,
            NEW.trimestre,
            NEW.peso_percentual,
            NEW.ordem,
            NEW.obrigatorio
        );
        
        -- Also create in componentes_avaliacao for backwards compatibility
        -- Check existence manually explicitly to avoid ON CONFLICT errors because validation of constraints might fail
        IF NOT EXISTS (
            SELECT 1 FROM componentes_avaliacao 
            WHERE disciplina_id = v_link.disciplina_id 
            AND codigo_componente = NEW.codigo_componente
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
            );
        END IF;
    END LOOP;
    
    -- Update sync timestamp
    UPDATE turma_template_link
    SET sincronizado_em = NOW()
    WHERE disciplina_template_id = NEW.disciplina_template_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
