-- ============================================
-- MIGRATION: Fix Municipality Aggregation
-- Purpose: Normalize municipality names to prevent duplicate counting
-- Date: 2026-01-10
-- Issue: Municipalities appearing twice due to text variations (case, spacing)
-- ============================================

-- Fix get_estatisticas_por_municipio to normalize municipality names
CREATE OR REPLACE FUNCTION get_estatisticas_por_municipio(p_provincia TEXT)
RETURNS TABLE (
    municipio TEXT,
    total_escolas INTEGER,
    escolas_activas INTEGER,
    total_professores BIGINT,
    total_alunos BIGINT,
    total_turmas BIGINT,
    media_aprovacao NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Normalize municipality name: TRIM and use consistent capitalization
        INITCAP(TRIM(e.municipio)) as municipio,
        COUNT(DISTINCT e.id)::INTEGER as total_escolas,
        COUNT(DISTINCT e.id) FILTER (WHERE e.ativo = true AND NOT COALESCE(e.bloqueado, false))::INTEGER as escolas_activas,
        COUNT(DISTINCT p.id)::BIGINT as total_professores,
        COUNT(DISTINCT a.id)::BIGINT as total_alunos,
        COUNT(DISTINCT t.id)::BIGINT as total_turmas,
        COALESCE(AVG(nf.nota_final), 0)::NUMERIC as media_aprovacao
    FROM escolas e
    LEFT JOIN professores p ON p.escola_id = e.id AND p.ativo = true
    LEFT JOIN turmas t ON t.escola_id = e.id
    LEFT JOIN alunos a ON a.turma_id = t.id AND a.ativo = true
    LEFT JOIN notas_finais nf ON nf.turma_id = t.id
    WHERE e.provincia = p_provincia
    -- Group by normalized municipality name
    GROUP BY INITCAP(TRIM(e.municipio))
    ORDER BY INITCAP(TRIM(e.municipio));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update get_estatisticas_provincia to also normalize municipality counting
CREATE OR REPLACE FUNCTION get_estatisticas_provincia(p_provincia TEXT)
RETURNS TABLE (
    total_municipios INTEGER,
    total_direcoes_municipais INTEGER,
    direcoes_activas INTEGER,
    direcoes_inactivas INTEGER,
    total_escolas INTEGER,
    escolas_activas INTEGER,
    total_professores BIGINT,
    total_alunos BIGINT,
    total_turmas BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            COUNT(DISTINCT dm.municipio)::INTEGER as total_municipios,
            COUNT(DISTINCT dm.id)::INTEGER as total_direcoes,
            COUNT(DISTINCT dm.id) FILTER (WHERE dm.ativo = true)::INTEGER as direcoes_activas,
            COUNT(DISTINCT dm.id) FILTER (WHERE dm.ativo = false)::INTEGER as direcoes_inactivas
        FROM direcoes_municipais dm
        WHERE dm.provincia = p_provincia
    ),
    escola_stats AS (
        SELECT 
            COUNT(DISTINCT e.id)::INTEGER as total_escolas,
            COUNT(DISTINCT e.id) FILTER (WHERE e.ativo = true AND NOT COALESCE(e.bloqueado, false))::INTEGER as escolas_activas,
            -- Count unique municipalities with normalized names
            COUNT(DISTINCT INITCAP(TRIM(e.municipio)))::INTEGER as total_municipios_escolas
        FROM escolas e
        WHERE e.provincia = p_provincia
    ),
    prof_stats AS (
        SELECT COUNT(*)::BIGINT as total_professores
        FROM professores p
        JOIN escolas e ON p.escola_id = e.id
        WHERE e.provincia = p_provincia AND p.ativo = true
    ),
    aluno_stats AS (
        SELECT COUNT(*)::BIGINT as total_alunos
        FROM alunos a
        JOIN turmas t ON a.turma_id = t.id
        JOIN escolas e ON t.escola_id = e.id
        WHERE e.provincia = p_provincia AND a.ativo = true
    ),
    turma_stats AS (
        SELECT COUNT(*)::BIGINT as total_turmas
        FROM turmas t
        JOIN escolas e ON t.escola_id = e.id
        WHERE e.provincia = p_provincia
    )
    SELECT 
        -- Use the maximum between municipal directorates count and schools municipalities count
        GREATEST(s.total_municipios, es.total_municipios_escolas) as total_municipios,
        s.total_direcoes,
        s.direcoes_activas,
        s.direcoes_inactivas,
        es.total_escolas,
        es.escolas_activas,
        ps.total_professores,
        als.total_alunos,
        ts.total_turmas
    FROM stats s, escola_stats es, prof_stats ps, aluno_stats als, turma_stats ts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_estatisticas_provincia(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_estatisticas_por_municipio(TEXT) TO authenticated;

-- ============================================
-- END OF MIGRATION
-- ============================================
