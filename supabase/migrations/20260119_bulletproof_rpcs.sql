-- ============================================
-- FIX MIGRATION: Correção DEFINITIVA de erros de tipo (text vs integer)
-- Date: 2026-01-19
-- ============================================

-- 1. Eliminar funções antigas para garantir limpeza
DROP FUNCTION IF EXISTS get_pagamentos_aluno_por_mes(uuid, integer);
DROP FUNCTION IF EXISTS get_estatisticas_propinas(uuid, integer);

-- 2. Recriar função de Estatísticas com CAST explícito
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
    v_ano := COALESCE(p_ano, EXTRACT(YEAR FROM NOW())::INTEGER);
    
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
        -- FIX: Usar ILIKE com CAST para garantir que funciona se ano_lectivo for TEXT
        AND t.ano_lectivo::TEXT ILIKE '%' || v_ano::TEXT || '%'
    ),
    config_valores AS (
        SELECT COALESCE(
            (SELECT valor_mensalidade FROM propinas_config 
             WHERE escola_id = p_escola_id 
             AND (turma_id IS NULL OR turma_id IN (SELECT DISTINCT turma_id FROM alunos_ativos))
             -- FIX: Comparação segura com CAST
             AND ano_lectivo::TEXT = v_ano::TEXT
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
        -- FIX: Garantir comparação segura
        AND pp.ano_referencia::INTEGER = v_ano
        -- FIX: Excluir pagamentos anulados das estatísticas
        AND pp.estado = 'valido'
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

-- 3. Recriar função de Pagamentos Aluno com CAST explícito
CREATE OR REPLACE FUNCTION get_pagamentos_aluno_por_mes(
    p_aluno_id UUID,
    p_ano INTEGER DEFAULT NULL
)
RETURNS TABLE (
    mes INTEGER,
    status TEXT,
    valor_pago NUMERIC,
    valor_total NUMERIC,
    detalhes_pagamentos JSONB
) AS $$
DECLARE
    v_ano INTEGER;
    v_valor_mensal NUMERIC;
    v_escola_id UUID;
    v_turma_id UUID;
BEGIN
    v_ano := COALESCE(p_ano, EXTRACT(YEAR FROM NOW())::INTEGER);
    
    SELECT t.escola_id, a.turma_id INTO v_escola_id, v_turma_id
    FROM alunos a
    JOIN turmas t ON a.turma_id = t.id
    WHERE a.id = p_aluno_id;

    SELECT valor_mensalidade INTO v_valor_mensal
    FROM propinas_config 
    WHERE escola_id = v_escola_id 
    AND (turma_id IS NULL OR turma_id = v_turma_id)
    -- FIX: Comparação segura com CAST
    AND ano_lectivo::TEXT = v_ano::TEXT
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
        -- FIX: Garantir comparação segura
        AND ano_referencia::INTEGER = v_ano
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
