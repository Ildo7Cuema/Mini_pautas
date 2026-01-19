-- ============================================
-- FIX MIGRATION: Corrigir erro de tipo (text = integer) na função de estatísticas
-- Date: 2026-01-19
-- ============================================

-- Primeiro, eliminar a função existente para evitar conflitos de assinatura (opcional mas seguro)
DROP FUNCTION IF EXISTS get_estatisticas_propinas(uuid, integer);

-- Função para obter estatísticas de pagamentos
-- CORREÇÃO: Comparar ano_lectivo (TEXT) com v_ano (INTEGER) usando ILIKE e CAST
CREATE OR REPLACE FUNCTION get_estatisticas_propinas(
    p_escola_id UUID,
    p_ano INTEGER DEFAULT NULL
)
RETURNS TABLE (
    total_alunos INTEGER,
    total_previsto NUMERIC,
    total_recebido NUMERIC,
    total_em_falta NUMERIC,
    percentagem_recebido NUMERIC
) AS $$
DECLARE
    v_ano INTEGER;
    v_meses_decorridos INTEGER;
BEGIN
    -- Usar ano atual se não especificado
    v_ano := COALESCE(p_ano, EXTRACT(YEAR FROM NOW())::INTEGER);
    
    -- Calcular meses decorridos no ano
    IF v_ano = EXTRACT(YEAR FROM NOW())::INTEGER THEN
        v_meses_decorridos := EXTRACT(MONTH FROM NOW())::INTEGER;
    ELSE
        v_meses_decorridos := 12;
    END IF;
    
    RETURN QUERY
    WITH alunos_ativos AS (
        SELECT a.id, a.turma_id
        FROM alunos a
        JOIN turmas t ON a.turma_id = t.id
        WHERE t.escola_id = p_escola_id
        AND a.ativo = true
        -- FIX: Use ILIKE with converted text for loose matching (e.g. 2025 matches "2025/2026")
        AND t.ano_lectivo ILIKE '%' || v_ano::TEXT || '%'
    ),
    config_valores AS (
        SELECT COALESCE(
            (SELECT valor_mensalidade FROM propinas_config 
             WHERE escola_id = p_escola_id 
             AND (turma_id IS NULL OR turma_id IN (SELECT DISTINCT turma_id FROM alunos_ativos))
             AND ano_lectivo = v_ano
             AND ativo = true
             ORDER BY turma_id NULLS LAST
             LIMIT 1),
            0
        ) as valor
    ),
    totais AS (
        SELECT 
            (SELECT COUNT(*)::INTEGER FROM alunos_ativos) as total_alunos,
            (SELECT valor FROM config_valores) as valor_mensal,
            COALESCE(SUM(pp.valor), 0) as total_pago
        FROM pagamentos_propinas pp
        WHERE pp.escola_id = p_escola_id
        AND pp.ano_referencia = v_ano
    )
    SELECT 
        t.total_alunos,
        (t.total_alunos * t.valor_mensal * v_meses_decorridos)::NUMERIC as total_previsto,
        t.total_pago as total_recebido,
        ((t.total_alunos * t.valor_mensal * v_meses_decorridos) - t.total_pago)::NUMERIC as total_em_falta,
        CASE 
            WHEN (t.total_alunos * t.valor_mensal * v_meses_decorridos) > 0 THEN
                ROUND((t.total_pago / (t.total_alunos * t.valor_mensal * v_meses_decorridos)) * 100, 2)
            ELSE 0
        END as percentagem_recebido
    FROM totais t;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
