-- ============================================
-- MIGRATION: Component Catalog RPC Functions
-- Purpose: RPC functions to manage the component catalog
-- Date: 2026-01-17
-- ============================================

-- ============================================
-- FUNCTION: get_or_create_componente_catalogo
-- Gets an existing component from catalog or creates a new one
-- Returns the component catalog ID
-- ============================================

CREATE OR REPLACE FUNCTION get_or_create_componente_catalogo(
    p_escola_id UUID,
    p_codigo_componente TEXT,
    p_nome TEXT DEFAULT NULL,
    p_peso_padrao NUMERIC DEFAULT 100,
    p_escala_minima NUMERIC DEFAULT 0,
    p_escala_maxima NUMERIC DEFAULT 20,
    p_is_calculated BOOLEAN DEFAULT false,
    p_formula_expression TEXT DEFAULT NULL,
    p_depends_on_codes TEXT[] DEFAULT '{}',
    p_tipo_calculo TEXT DEFAULT 'trimestral',
    p_descricao TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_componente_id UUID;
    v_nome_final TEXT;
BEGIN
    -- Normalize the code
    p_codigo_componente := UPPER(TRIM(p_codigo_componente));
    
    -- Try to find existing component
    SELECT id INTO v_componente_id
    FROM componentes_catalogo
    WHERE escola_id = p_escola_id 
    AND codigo_componente = p_codigo_componente;
    
    -- If not found, create new
    IF v_componente_id IS NULL THEN
        -- Use provided name or generate from code
        v_nome_final := COALESCE(p_nome, p_codigo_componente);
        
        INSERT INTO componentes_catalogo (
            escola_id,
            codigo_componente,
            nome,
            peso_padrao,
            escala_minima,
            escala_maxima,
            is_calculated,
            formula_expression,
            depends_on_codes,
            tipo_calculo,
            descricao
        ) VALUES (
            p_escola_id,
            p_codigo_componente,
            v_nome_final,
            p_peso_padrao,
            p_escala_minima,
            p_escala_maxima,
            p_is_calculated,
            p_formula_expression,
            p_depends_on_codes,
            p_tipo_calculo,
            p_descricao
        )
        RETURNING id INTO v_componente_id;
    END IF;
    
    RETURN v_componente_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_or_create_componente_catalogo IS 'Gets an existing component from catalog or creates a new one';

-- ============================================
-- FUNCTION: associate_componente_to_disciplina
-- Associates a catalog component to a discipline for a trimester
-- ============================================

CREATE OR REPLACE FUNCTION associate_componente_to_disciplina(
    p_disciplina_id UUID,
    p_componente_catalogo_id UUID,
    p_trimestre INTEGER,
    p_peso_percentual NUMERIC DEFAULT NULL,
    p_ordem INTEGER DEFAULT 1,
    p_obrigatorio BOOLEAN DEFAULT true
) RETURNS UUID AS $$
DECLARE
    v_association_id UUID;
    v_peso NUMERIC;
BEGIN
    -- Validate trimestre
    IF p_trimestre NOT IN (1, 2, 3) THEN
        RAISE EXCEPTION 'Trimestre inválido: %. Deve ser 1, 2 ou 3.', p_trimestre;
    END IF;
    
    -- Get default weight from catalog if not provided
    IF p_peso_percentual IS NULL THEN
        SELECT peso_padrao INTO v_peso
        FROM componentes_catalogo
        WHERE id = p_componente_catalogo_id;
    ELSE
        v_peso := p_peso_percentual;
    END IF;
    
    -- Check if already exists
    SELECT id INTO v_association_id
    FROM disciplina_componentes
    WHERE disciplina_id = p_disciplina_id
    AND componente_catalogo_id = p_componente_catalogo_id
    AND trimestre = p_trimestre;
    
    IF v_association_id IS NOT NULL THEN
        -- Update existing
        UPDATE disciplina_componentes
        SET peso_percentual = v_peso,
            ordem = p_ordem,
            obrigatorio = p_obrigatorio,
            updated_at = NOW()
        WHERE id = v_association_id;
    ELSE
        -- Create new association
        INSERT INTO disciplina_componentes (
            disciplina_id,
            componente_catalogo_id,
            trimestre,
            peso_percentual,
            ordem,
            obrigatorio
        ) VALUES (
            p_disciplina_id,
            p_componente_catalogo_id,
            p_trimestre,
            v_peso,
            p_ordem,
            p_obrigatorio
        )
        RETURNING id INTO v_association_id;
    END IF;
    
    RETURN v_association_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION associate_componente_to_disciplina IS 'Associates a catalog component to a discipline for a specific trimester';

-- ============================================
-- FUNCTION: add_componente_to_disciplina
-- Combined function: creates component in catalog if needed 
-- and associates to discipline
-- ============================================

CREATE OR REPLACE FUNCTION add_componente_to_disciplina(
    p_disciplina_id UUID,
    p_codigo_componente TEXT,
    p_nome TEXT,
    p_trimestre INTEGER,
    p_peso_percentual NUMERIC DEFAULT 100,
    p_ordem INTEGER DEFAULT 1,
    p_obrigatorio BOOLEAN DEFAULT true,
    p_escala_minima NUMERIC DEFAULT 0,
    p_escala_maxima NUMERIC DEFAULT 20,
    p_is_calculated BOOLEAN DEFAULT false,
    p_formula_expression TEXT DEFAULT NULL,
    p_depends_on_codes TEXT[] DEFAULT '{}',
    p_tipo_calculo TEXT DEFAULT 'trimestral',
    p_descricao TEXT DEFAULT NULL
) RETURNS TABLE (
    disciplina_componente_id UUID,
    componente_catalogo_id UUID,
    is_new_component BOOLEAN
) AS $$
DECLARE
    v_escola_id UUID;
    v_componente_id UUID;
    v_association_id UUID;
    v_is_new BOOLEAN := false;
BEGIN
    -- Get escola_id from disciplina
    SELECT t.escola_id INTO v_escola_id
    FROM disciplinas d
    JOIN turmas t ON d.turma_id = t.id
    WHERE d.id = p_disciplina_id;
    
    IF v_escola_id IS NULL THEN
        RAISE EXCEPTION 'Disciplina não encontrada: %', p_disciplina_id;
    END IF;
    
    -- Check if component already exists in catalog
    SELECT id INTO v_componente_id
    FROM componentes_catalogo
    WHERE escola_id = v_escola_id 
    AND codigo_componente = UPPER(TRIM(p_codigo_componente));
    
    -- Create if not exists
    IF v_componente_id IS NULL THEN
        v_is_new := true;
        v_componente_id := get_or_create_componente_catalogo(
            v_escola_id,
            UPPER(TRIM(p_codigo_componente)),
            p_nome,
            p_peso_percentual,
            p_escala_minima,
            p_escala_maxima,
            p_is_calculated,
            p_formula_expression,
            p_depends_on_codes,
            p_tipo_calculo,
            p_descricao
        );
    END IF;
    
    -- Associate to discipline
    v_association_id := associate_componente_to_disciplina(
        p_disciplina_id,
        v_componente_id,
        p_trimestre,
        p_peso_percentual,
        p_ordem,
        p_obrigatorio
    );
    
    RETURN QUERY SELECT v_association_id, v_componente_id, v_is_new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION add_componente_to_disciplina IS 'Creates component in catalog if needed and associates to discipline';

-- ============================================
-- FUNCTION: get_componentes_catalogo_for_escola
-- Gets all catalog components for a school
-- ============================================

CREATE OR REPLACE FUNCTION get_componentes_catalogo_for_escola(
    p_escola_id UUID
) RETURNS TABLE (
    id UUID,
    codigo_componente TEXT,
    nome TEXT,
    peso_padrao NUMERIC,
    escala_minima NUMERIC,
    escala_maxima NUMERIC,
    is_calculated BOOLEAN,
    formula_expression TEXT,
    depends_on_codes TEXT[],
    tipo_calculo TEXT,
    descricao TEXT,
    usage_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cc.id,
        cc.codigo_componente,
        cc.nome,
        cc.peso_padrao,
        cc.escala_minima,
        cc.escala_maxima,
        cc.is_calculated,
        cc.formula_expression,
        cc.depends_on_codes,
        cc.tipo_calculo,
        cc.descricao,
        COUNT(DISTINCT dc.disciplina_id) as usage_count
    FROM componentes_catalogo cc
    LEFT JOIN disciplina_componentes dc ON dc.componente_catalogo_id = cc.id
    WHERE cc.escola_id = p_escola_id AND cc.ativo = true
    GROUP BY cc.id
    ORDER BY cc.codigo_componente;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_componentes_catalogo_for_escola IS 'Gets all active catalog components for a school with usage count';

-- ============================================
-- FUNCTION: get_componentes_for_disciplina
-- Gets all components associated with a discipline
-- ============================================

CREATE OR REPLACE FUNCTION get_componentes_for_disciplina(
    p_disciplina_id UUID,
    p_trimestre INTEGER DEFAULT NULL
) RETURNS TABLE (
    disciplina_componente_id UUID,
    componente_catalogo_id UUID,
    codigo_componente TEXT,
    nome TEXT,
    trimestre INTEGER,
    peso_percentual NUMERIC,
    ordem INTEGER,
    obrigatorio BOOLEAN,
    escala_minima NUMERIC,
    escala_maxima NUMERIC,
    is_calculated BOOLEAN,
    formula_expression TEXT,
    depends_on_codes TEXT[],
    tipo_calculo TEXT,
    descricao TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.id as disciplina_componente_id,
        cc.id as componente_catalogo_id,
        cc.codigo_componente,
        cc.nome,
        dc.trimestre,
        dc.peso_percentual,
        dc.ordem,
        dc.obrigatorio,
        cc.escala_minima,
        cc.escala_maxima,
        cc.is_calculated,
        cc.formula_expression,
        cc.depends_on_codes,
        cc.tipo_calculo,
        cc.descricao
    FROM disciplina_componentes dc
    JOIN componentes_catalogo cc ON dc.componente_catalogo_id = cc.id
    WHERE dc.disciplina_id = p_disciplina_id
    AND (p_trimestre IS NULL OR dc.trimestre = p_trimestre)
    ORDER BY dc.trimestre, dc.ordem;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_componentes_for_disciplina IS 'Gets all components associated with a discipline, optionally filtered by trimester';

-- ============================================
-- FUNCTION: remove_componente_from_disciplina
-- Removes a component association from a discipline
-- Only succeeds if no grades exist for this association
-- ============================================

CREATE OR REPLACE FUNCTION remove_componente_from_disciplina(
    p_disciplina_componente_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_has_notas BOOLEAN;
BEGIN
    -- Check if any grades exist
    SELECT EXISTS(
        SELECT 1 FROM notas 
        WHERE disciplina_componente_id = p_disciplina_componente_id
    ) INTO v_has_notas;
    
    IF v_has_notas THEN
        RAISE EXCEPTION 'Não é possível remover componente com notas lançadas. Remova as notas primeiro.';
    END IF;
    
    -- Delete the association
    DELETE FROM disciplina_componentes
    WHERE id = p_disciplina_componente_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION remove_componente_from_disciplina IS 'Removes a component association from a discipline (only if no grades exist)';

-- ============================================
-- FUNCTION: search_componentes_catalogo
-- Searches catalog components by code or name
-- ============================================

CREATE OR REPLACE FUNCTION search_componentes_catalogo(
    p_escola_id UUID,
    p_search_term TEXT
) RETURNS TABLE (
    id UUID,
    codigo_componente TEXT,
    nome TEXT,
    peso_padrao NUMERIC,
    is_calculated BOOLEAN,
    tipo_calculo TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cc.id,
        cc.codigo_componente,
        cc.nome,
        cc.peso_padrao,
        cc.is_calculated,
        cc.tipo_calculo
    FROM componentes_catalogo cc
    WHERE cc.escola_id = p_escola_id
    AND cc.ativo = true
    AND (
        cc.codigo_componente ILIKE '%' || p_search_term || '%'
        OR cc.nome ILIKE '%' || p_search_term || '%'
    )
    ORDER BY 
        -- Prioritize exact code match
        CASE WHEN UPPER(cc.codigo_componente) = UPPER(p_search_term) THEN 0 ELSE 1 END,
        cc.codigo_componente
    LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION search_componentes_catalogo IS 'Searches catalog components by code or name';

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION get_or_create_componente_catalogo TO authenticated;
GRANT EXECUTE ON FUNCTION associate_componente_to_disciplina TO authenticated;
GRANT EXECUTE ON FUNCTION add_componente_to_disciplina TO authenticated;
GRANT EXECUTE ON FUNCTION get_componentes_catalogo_for_escola TO authenticated;
GRANT EXECUTE ON FUNCTION get_componentes_for_disciplina TO authenticated;
GRANT EXECUTE ON FUNCTION remove_componente_from_disciplina TO authenticated;
GRANT EXECUTE ON FUNCTION search_componentes_catalogo TO authenticated;
