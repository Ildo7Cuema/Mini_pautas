-- Migration: Fix ano_lectivo type mismatch in tuition functions
-- Purpose: The ano_lectivo column was changed from INTEGER to TEXT, but functions still use INTEGER
-- Error: "operator does not exist: text = integer"

-- Fix get_estatisticas_propinas function
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
    v_ano_text TEXT;
    v_meses_decorridos INTEGER;
BEGIN
    -- Usar ano atual se não especificado
    v_ano := COALESCE(p_ano, EXTRACT(YEAR FROM NOW())::INTEGER);
    -- Convert to text for comparison with ano_lectivo column
    v_ano_text := v_ano::TEXT;
    
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
        -- Compare as TEXT (ano_lectivo is now TEXT type)
        -- Handle both formats: "2025" and "2025/2026"
        AND (t.ano_lectivo = v_ano_text OR t.ano_lectivo LIKE v_ano_text || '/%')
    ),
    config_valores AS (
        SELECT COALESCE(
            (SELECT valor_mensalidade FROM propinas_config 
             WHERE escola_id = p_escola_id 
             AND (turma_id IS NULL OR turma_id IN (SELECT DISTINCT turma_id FROM alunos_ativos))
             -- Compare as TEXT
             AND (ano_lectivo = v_ano_text OR ano_lectivo LIKE v_ano_text || '/%')
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

-- Add comment
COMMENT ON FUNCTION get_estatisticas_propinas IS 'Obtém estatísticas de pagamentos de propinas para uma escola (fixed for TEXT ano_lectivo)';
