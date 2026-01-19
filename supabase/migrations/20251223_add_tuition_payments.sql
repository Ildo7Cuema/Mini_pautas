-- ============================================
-- MIGRATION: Sistema de Pagamento de Propinas
-- Purpose: Add tuition payment tracking for students
-- Date: 2025-12-23
-- ============================================

-- ============================================
-- CONFIGURATION TABLE
-- ============================================

-- Tabela de configuração de propinas por escola/turma
CREATE TABLE IF NOT EXISTS propinas_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    turma_id UUID REFERENCES turmas(id) ON DELETE CASCADE,
    ano_lectivo INTEGER NOT NULL,
    valor_mensalidade NUMERIC(10,2) NOT NULL CHECK (valor_mensalidade > 0),
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_config_escola_turma_ano UNIQUE (escola_id, turma_id, ano_lectivo)
);

-- ============================================
-- PAYMENTS TABLE
-- ============================================

-- Tabela de pagamentos de propinas
CREATE TABLE IF NOT EXISTS pagamentos_propinas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    mes_referencia INTEGER NOT NULL CHECK (mes_referencia >= 1 AND mes_referencia <= 12),
    ano_referencia INTEGER NOT NULL CHECK (ano_referencia >= 2020 AND ano_referencia <= 2100),
    valor NUMERIC(10,2) NOT NULL CHECK (valor > 0),
    data_pagamento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metodo_pagamento TEXT NOT NULL CHECK (metodo_pagamento IN ('numerario', 'transferencia', 'deposito')),
    numero_recibo TEXT NOT NULL UNIQUE,
    observacao TEXT,
    
    -- AGT / Legal Compliance Fields
    estado TEXT NOT NULL DEFAULT 'valido' CHECK (estado IN ('valido', 'anulado')),
    motivo_anulacao TEXT,
    data_anulacao TIMESTAMP WITH TIME ZONE,
    anulado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    hash TEXT NOT NULL,
    hash_control TEXT NOT NULL, -- First 4 chars of hash
    sistema_certificado TEXT DEFAULT 'Processado por programa válido n31.1/AGT20',
    tipo_documento TEXT DEFAULT 'RG', -- RG = Recibo Global / Receipt
    
    registado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    -- NOTE: removed unique constraint on (aluno_id, mes_referencia, ano_referencia) to allow partial payments
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_propinas_config_escola ON propinas_config(escola_id);
CREATE INDEX IF NOT EXISTS idx_propinas_config_turma ON propinas_config(turma_id);
CREATE INDEX IF NOT EXISTS idx_propinas_config_ano ON propinas_config(ano_lectivo);
CREATE INDEX IF NOT EXISTS idx_propinas_config_ativo ON propinas_config(ativo);

CREATE INDEX IF NOT EXISTS idx_pagamentos_propinas_aluno ON pagamentos_propinas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_propinas_escola ON pagamentos_propinas(escola_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_propinas_ano_mes ON pagamentos_propinas(ano_referencia, mes_referencia);
CREATE INDEX IF NOT EXISTS idx_pagamentos_propinas_recibo ON pagamentos_propinas(numero_recibo);
CREATE INDEX IF NOT EXISTS idx_pagamentos_propinas_data ON pagamentos_propinas(data_pagamento DESC);

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger para actualizar updated_at
CREATE TRIGGER update_propinas_config_updated_at 
    BEFORE UPDATE ON propinas_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pagamentos_propinas_updated_at 
    BEFORE UPDATE ON pagamentos_propinas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers para auditoria
CREATE TRIGGER audit_propinas_config 
    AFTER INSERT OR UPDATE OR DELETE ON propinas_config
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_pagamentos_propinas 
    AFTER INSERT OR UPDATE OR DELETE ON pagamentos_propinas
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Função para gerar número de recibo único
CREATE OR REPLACE FUNCTION gerar_numero_recibo(p_escola_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_codigo_escola TEXT;
    v_ano TEXT;
    v_sequencia INTEGER;
    v_numero_recibo TEXT;
BEGIN
    -- Obter código da escola
    SELECT codigo_escola INTO v_codigo_escola
    FROM escolas WHERE id = p_escola_id;
    
    IF v_codigo_escola IS NULL THEN
        v_codigo_escola := 'ESC';
    END IF;
    
    -- Ano atual
    v_ano := TO_CHAR(NOW(), 'YY');
    
    -- Próximo número na sequência
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(numero_recibo FROM '[0-9]+$') AS INTEGER)
    ), 0) + 1 INTO v_sequencia
    FROM pagamentos_propinas
    WHERE escola_id = p_escola_id
    AND numero_recibo LIKE v_codigo_escola || '-' || v_ano || '-%';
    
    -- Formatar número: ESCOLA-AA-NNNNNN
    v_numero_recibo := v_codigo_escola || '-' || v_ano || '-' || LPAD(v_sequencia::TEXT, 6, '0');
    
    RETURN v_numero_recibo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter estatísticas de pagamentos
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
        AND t.ano_lectivo = v_ano
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

-- Função para obter status de pagamentos de um aluno (Aggregated)
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

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE propinas_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos_propinas ENABLE ROW LEVEL SECURITY;

-- SUPERADMIN pode ver tudo
CREATE POLICY "SUPERADMIN can view all propinas_config"
    ON propinas_config FOR SELECT USING (is_superadmin());

CREATE POLICY "SUPERADMIN can manage propinas_config"
    ON propinas_config FOR ALL USING (is_superadmin());

CREATE POLICY "SUPERADMIN can view all pagamentos_propinas"
    ON pagamentos_propinas FOR SELECT USING (is_superadmin());

CREATE POLICY "SUPERADMIN can manage pagamentos_propinas"
    ON pagamentos_propinas FOR ALL USING (is_superadmin());

-- Escolas podem gerir as suas próprias configurações e pagamentos
CREATE POLICY "Escolas can view own propinas_config"
    ON propinas_config FOR SELECT
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

CREATE POLICY "Escolas can manage own propinas_config"
    ON propinas_config FOR ALL
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

CREATE POLICY "Escolas can view own pagamentos_propinas"
    ON pagamentos_propinas FOR SELECT
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

CREATE POLICY "Escolas can insert pagamentos_propinas"
    ON pagamentos_propinas FOR INSERT
    WITH CHECK (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

CREATE POLICY "Escolas can update own pagamentos_propinas"
    ON pagamentos_propinas FOR UPDATE
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE propinas_config IS 'Configuração de valores de mensalidades/propinas por escola e turma';
COMMENT ON TABLE pagamentos_propinas IS 'Registo de pagamentos de propinas pelos alunos';
COMMENT ON FUNCTION gerar_numero_recibo IS 'Gera número de recibo único no formato ESCOLA-AA-NNNNNN';
COMMENT ON FUNCTION get_estatisticas_propinas IS 'Obtém estatísticas de pagamentos de propinas para uma escola';
COMMENT ON FUNCTION get_pagamentos_aluno_por_mes IS 'Obtém status de pagamentos por mês para um aluno';

-- ============================================
-- END OF MIGRATION
-- ============================================
