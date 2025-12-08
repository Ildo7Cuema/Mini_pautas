-- ============================================
-- MIGRATION: Auto-Calculate Component Grades
-- Description: Automatically calculates grades for calculated components
--              when dependent component grades are inserted or updated
-- Date: 2025-12-07
-- ============================================

-- ============================================
-- FORMULA EVALUATION FUNCTION
-- ============================================

/**
 * Safely evaluates a mathematical formula with given component values
 * 
 * @param expression - Formula expression (e.g., "P1 * 0.3 + P2 * 0.7")
 * @param component_values - JSONB object with component codes and their values
 * @returns Calculated numeric result
 * 
 * Example:
 *   evaluate_formula('P1 * 0.3 + P2 * 0.7', '{"P1": 15, "P2": 18}'::jsonb)
 *   Returns: 16.80
 */
CREATE OR REPLACE FUNCTION evaluate_formula(
    expression TEXT,
    component_values JSONB
) RETURNS NUMERIC AS $$
DECLARE
    eval_expression TEXT;
    component_code TEXT;
    component_value TEXT;
    result NUMERIC;
BEGIN
    -- Start with the original expression
    eval_expression := expression;
    
    -- Replace each component code with its numeric value
    -- Sort by length descending to avoid partial replacements (e.g., P1 before P10)
    FOR component_code IN 
        SELECT key 
        FROM jsonb_each_text(component_values)
        ORDER BY length(key) DESC
    LOOP
        component_value := component_values->>component_code;
        
        -- Use word boundary replacement to avoid partial matches
        eval_expression := regexp_replace(
            eval_expression,
            '\m' || component_code || '\M',
            component_value,
            'g'
        );
    END LOOP;
    
    -- Validate that only numbers and operators remain
    IF eval_expression !~ '^[\d\s\+\-\*\/\(\)\.]+$' THEN
        RAISE EXCEPTION 'Invalid formula after substitution: %', eval_expression;
    END IF;
    
    -- Evaluate the mathematical expression
    EXECUTE 'SELECT ' || eval_expression INTO result;
    
    -- Round to 2 decimal places
    RETURN ROUND(result, 2);
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error evaluating formula "%" with values %: %', 
            expression, component_values::text, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- AUTO-CALCULATION TRIGGER FUNCTION
-- ============================================

/**
 * Automatically calculates and saves grades for calculated components
 * when a dependent component grade is inserted or updated
 * 
 * This function:
 * 1. Finds all calculated components that depend on the inserted/updated component
 * 2. For each calculated component, checks if all dependent grades exist
 * 3. If all dependencies are met, evaluates the formula and saves the result
 */
CREATE OR REPLACE FUNCTION calculate_dependent_components()
RETURNS TRIGGER AS $$
DECLARE
    calc_component RECORD;
    dep_component RECORD;
    formula_values JSONB;
    calculated_grade NUMERIC;
    missing_count INTEGER;
    total_deps INTEGER;
BEGIN
    -- Find all calculated components that depend on the inserted/updated component
    FOR calc_component IN 
        SELECT DISTINCT ca.*
        FROM componentes_avaliacao ca
        WHERE ca.is_calculated = true
        AND ca.depends_on_components IS NOT NULL
        AND ca.depends_on_components ? NEW.componente_id::text
        AND ca.turma_id = NEW.turma_id
        AND ca.disciplina_id IN (
            SELECT disciplina_id 
            FROM componentes_avaliacao 
            WHERE id = NEW.componente_id
        )
    LOOP
        -- Initialize formula values
        formula_values := '{}'::jsonb;
        total_deps := jsonb_array_length(calc_component.depends_on_components);
        
        -- Get all dependent component grades for this student and trimestre
        FOR dep_component IN
            SELECT 
                ca.codigo_componente,
                n.valor
            FROM componentes_avaliacao ca
            LEFT JOIN notas n ON n.componente_id = ca.id 
                AND n.aluno_id = NEW.aluno_id 
                AND n.trimestre = NEW.trimestre
            WHERE ca.id IN (
                SELECT jsonb_array_elements_text(calc_component.depends_on_components)::uuid
            )
        LOOP
            -- Only add to formula_values if grade exists
            IF dep_component.valor IS NOT NULL THEN
                formula_values := jsonb_set(
                    formula_values,
                    ARRAY[dep_component.codigo_componente],
                    to_jsonb(dep_component.valor)
                );
            END IF;
        END LOOP;
        
        -- Count how many dependencies we have values for
        SELECT COUNT(*) INTO missing_count
        FROM jsonb_object_keys(formula_values);
        
        -- Only calculate if ALL dependent components have grades
        IF missing_count = total_deps THEN
            BEGIN
                -- Evaluate the formula
                calculated_grade := evaluate_formula(
                    calc_component.formula_expression,
                    formula_values
                );
                
                -- Insert or update the calculated grade
                INSERT INTO notas (
                    aluno_id,
                    componente_id,
                    turma_id,
                    trimestre,
                    valor,
                    lancado_por,
                    observacao
                ) VALUES (
                    NEW.aluno_id,
                    calc_component.id,
                    NEW.turma_id,
                    NEW.trimestre,
                    calculated_grade,
                    NEW.lancado_por,
                    'Calculado automaticamente pela fórmula: ' || calc_component.formula_expression
                )
                ON CONFLICT (aluno_id, componente_id, trimestre)
                DO UPDATE SET
                    valor = calculated_grade,
                    updated_at = NOW(),
                    observacao = 'Recalculado automaticamente pela fórmula: ' || calc_component.formula_expression;
                
                RAISE NOTICE 'Calculated grade % for component % (student %, trimestre %)',
                    calculated_grade, calc_component.nome, NEW.aluno_id, NEW.trimestre;
                    
            EXCEPTION
                WHEN OTHERS THEN
                    -- Log error but don't fail the original insert
                    RAISE WARNING 'Failed to calculate grade for component %: %',
                        calc_component.nome, SQLERRM;
            END;
        ELSE
            RAISE NOTICE 'Not all dependencies met for component % (% of % grades available)',
                calc_component.nome, missing_count, total_deps;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CREATE TRIGGER
-- ============================================

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_calculate_dependent_components ON notas;

-- Create trigger that fires after insert or update on notas
CREATE TRIGGER trigger_calculate_dependent_components
    AFTER INSERT OR UPDATE ON notas
    FOR EACH ROW
    EXECUTE FUNCTION calculate_dependent_components();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION evaluate_formula(TEXT, JSONB) IS 
'Safely evaluates a mathematical formula by replacing component codes with their numeric values';

COMMENT ON FUNCTION calculate_dependent_components() IS 
'Trigger function that automatically calculates and saves grades for calculated components when dependent grades are inserted or updated';

-- ============================================
-- TESTING EXAMPLES
-- ============================================

-- Example 1: Test formula evaluation
-- SELECT evaluate_formula('P1 * 0.3 + P2 * 0.7', '{"P1": 15, "P2": 18}'::jsonb);
-- Expected result: 16.80

-- Example 2: Test with more complex formula
-- SELECT evaluate_formula('(P1 + P2) / 2', '{"P1": 14, "P2": 16}'::jsonb);
-- Expected result: 15.00

-- Example 3: Test with three components
-- SELECT evaluate_formula('P1 * 0.3 + P2 * 0.3 + TRABALHO * 0.4', 
--                         '{"P1": 15, "P2": 17, "TRABALHO": 18}'::jsonb);
-- Expected result: 16.80
