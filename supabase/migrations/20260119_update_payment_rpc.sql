-- ============================================
-- FIX MIGRATION: Atualizar função RPC de pagamentos para suportar pagamentos parciais
-- Date: 2026-01-19
-- ============================================

-- DROP function first because return signature changed
DROP FUNCTION IF EXISTS get_pagamentos_aluno_por_mes(uuid, integer);

-- Função para obter status de pagamentos de um aluno (Aggregated)
-- Esta versão garante que retorna EXATAMENTE 12 linhas (uma por mês)
-- e agrega múltiplos pagamentos do mesmo mês num único status.
CREATE OR REPLACE FUNCTION get_pagamentos_aluno_por_mes(
    p_aluno_id UUID,
    p_ano INTEGER DEFAULT NULL
)
RETURNS TABLE (
    mes INTEGER,
    status TEXT, -- 'pago', 'parcial', 'pendente'
    valor_pago NUMERIC,
    valor_total NUMERIC, -- Valor esperado
    detalhes_pagamentos JSONB
) AS $$
DECLARE
    v_ano INTEGER;
    v_valor_mensal NUMERIC;
    v_escola_id UUID;
    v_turma_id UUID;
BEGIN
    v_ano := COALESCE(p_ano, EXTRACT(YEAR FROM NOW())::INTEGER);
    
    -- Obter escola e turma do aluno
    SELECT t.escola_id, a.turma_id INTO v_escola_id, v_turma_id
    FROM alunos a
    JOIN turmas t ON a.turma_id = t.id
    WHERE a.id = p_aluno_id;

    -- Obter valor da mensalidade configurada
    SELECT valor_mensalidade INTO v_valor_mensal
    FROM propinas_config 
    WHERE escola_id = v_escola_id 
    AND (turma_id IS NULL OR turma_id = v_turma_id)
    AND ano_lectivo = v_ano
    AND ativo = true
    ORDER BY turma_id NULLS LAST
    LIMIT 1;

    v_valor_mensal := COALESCE(v_valor_mensal, 0);

    RETURN QUERY
    WITH pagamentos_mes AS (
        SELECT 
            mes_referencia,
            SUM(valor) as total_pago,
            jsonb_agg(jsonb_build_object(
                'id', id,
                'data', data_pagamento,
                'valor', valor,
                'recibo', numero_recibo,
                'estado', estado,
                'hash_control', hash_control
            )) as detalhes
        FROM pagamentos_propinas
        WHERE aluno_id = p_aluno_id 
        AND ano_referencia = v_ano
        AND estado = 'valido'
        GROUP BY mes_referencia
    )
    SELECT 
        m.mes,
        CASE 
            WHEN pm.total_pago >= v_valor_mensal THEN 'pago'
            WHEN pm.total_pago > 0 THEN 'parcial'
            ELSE 'pendente'
        END as status,
        COALESCE(pm.total_pago, 0) as valor_pago,
        v_valor_mensal as valor_total,
        COALESCE(pm.detalhes, '[]'::jsonb) as detalhes_pagamentos
    FROM generate_series(1, 12) AS m(mes)
    LEFT JOIN pagamentos_mes pm ON pm.mes_referencia = m.mes
    ORDER BY m.mes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
