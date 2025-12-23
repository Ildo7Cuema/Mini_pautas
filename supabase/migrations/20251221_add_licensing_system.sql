-- ============================================
-- MIGRATION: Sistema de Licenciamento EduGest Angola
-- Purpose: Add licensing and payment system for schools
-- Date: 2025-12-21
-- ============================================

-- ============================================
-- CORE LICENSING TABLES
-- ============================================

-- Tabela principal de licenças
CREATE TABLE IF NOT EXISTS licencas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    plano TEXT NOT NULL CHECK (plano IN ('trimestral', 'semestral', 'anual')),
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    estado TEXT NOT NULL DEFAULT 'ativa' CHECK (estado IN ('ativa', 'expirada', 'suspensa', 'cancelada')),
    valor NUMERIC(10,2) NOT NULL,
    data_ultimo_pagamento TIMESTAMP WITH TIME ZONE,
    criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_datas_validas CHECK (data_fim > data_inicio),
    CONSTRAINT check_valor_positivo CHECK (valor > 0)
);

-- Criar índice único parcial para garantir apenas uma licença ativa por escola
CREATE UNIQUE INDEX idx_licenca_escola_ativa 
    ON licencas(escola_id) 
    WHERE estado = 'ativa';

-- Tabela de transacções de pagamento
CREATE TABLE IF NOT EXISTS transacoes_pagamento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    licenca_id UUID REFERENCES licencas(id) ON DELETE SET NULL,
    escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('emis_gpo', 'proxypay', 'appypay', 'manual')),
    provider_transaction_id TEXT,
    valor NUMERIC(10,2) NOT NULL CHECK (valor > 0),
    estado TEXT NOT NULL DEFAULT 'pendente' CHECK (estado IN ('pendente', 'processando', 'sucesso', 'falha', 'cancelado', 'reembolsado')),
    metodo_pagamento TEXT CHECK (metodo_pagamento IN ('multicaixa_express', 'referencia', 'transferencia', 'numerario', NULL)),
    moeda TEXT NOT NULL DEFAULT 'AOA',
    descricao TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Histórico de alterações de licença (auditoria)
CREATE TABLE IF NOT EXISTS historico_licencas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    licenca_id UUID NOT NULL REFERENCES licencas(id) ON DELETE CASCADE,
    escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    estado_anterior TEXT,
    estado_novo TEXT NOT NULL,
    motivo TEXT,
    alterado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configuração de preços de licenças (permite ajuste dinâmico)
CREATE TABLE IF NOT EXISTS precos_licenca (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plano TEXT NOT NULL UNIQUE CHECK (plano IN ('trimestral', 'semestral', 'anual')),
    valor NUMERIC(10,2) NOT NULL CHECK (valor > 0),
    desconto_percentual NUMERIC(5,2) DEFAULT 0,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_licencas_escola ON licencas(escola_id);
CREATE INDEX IF NOT EXISTS idx_licencas_estado ON licencas(estado);
CREATE INDEX IF NOT EXISTS idx_licencas_data_fim ON licencas(data_fim);
CREATE INDEX IF NOT EXISTS idx_licencas_escola_estado ON licencas(escola_id, estado);

CREATE INDEX IF NOT EXISTS idx_transacoes_escola ON transacoes_pagamento(escola_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_licenca ON transacoes_pagamento(licenca_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_estado ON transacoes_pagamento(estado);
CREATE INDEX IF NOT EXISTS idx_transacoes_provider ON transacoes_pagamento(provider);
CREATE INDEX IF NOT EXISTS idx_transacoes_created ON transacoes_pagamento(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_historico_licenca ON historico_licencas(licenca_id);
CREATE INDEX IF NOT EXISTS idx_historico_escola ON historico_licencas(escola_id);
CREATE INDEX IF NOT EXISTS idx_historico_created ON historico_licencas(created_at DESC);

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger para actualizar updated_at
CREATE TRIGGER update_licencas_updated_at 
    BEFORE UPDATE ON licencas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transacoes_updated_at 
    BEFORE UPDATE ON transacoes_pagamento
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_precos_updated_at 
    BEFORE UPDATE ON precos_licenca
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para registar histórico quando estado da licença muda
CREATE OR REPLACE FUNCTION log_licenca_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.estado IS DISTINCT FROM NEW.estado THEN
        INSERT INTO historico_licencas (licenca_id, escola_id, estado_anterior, estado_novo, alterado_por)
        VALUES (NEW.id, NEW.escola_id, OLD.estado, NEW.estado, auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_licenca_estado_change
    AFTER UPDATE ON licencas
    FOR EACH ROW EXECUTE FUNCTION log_licenca_change();

-- Trigger para auditoria de licenças
CREATE TRIGGER audit_licencas 
    AFTER INSERT OR UPDATE OR DELETE ON licencas
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_transacoes 
    AFTER INSERT OR UPDATE OR DELETE ON transacoes_pagamento
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Verificar se escola tem licença válida
CREATE OR REPLACE FUNCTION escola_tem_licenca_valida(p_escola_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM licencas
        WHERE escola_id = p_escola_id
        AND estado = 'ativa'
        AND data_fim >= CURRENT_DATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Obter dias restantes da licença
CREATE OR REPLACE FUNCTION dias_restantes_licenca(p_escola_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_data_fim DATE;
BEGIN
    SELECT data_fim INTO v_data_fim
    FROM licencas
    WHERE escola_id = p_escola_id
    AND estado = 'ativa'
    ORDER BY data_fim DESC
    LIMIT 1;
    
    IF v_data_fim IS NULL THEN
        RETURN -1; -- Sem licença
    END IF;
    
    RETURN (v_data_fim - CURRENT_DATE)::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Calcular data de fim baseado no plano
CREATE OR REPLACE FUNCTION calcular_data_fim_licenca(p_data_inicio DATE, p_plano TEXT)
RETURNS DATE AS $$
BEGIN
    CASE p_plano
        WHEN 'trimestral' THEN
            RETURN p_data_inicio + INTERVAL '3 months';
        WHEN 'semestral' THEN
            RETURN p_data_inicio + INTERVAL '6 months';
        WHEN 'anual' THEN
            RETURN p_data_inicio + INTERVAL '1 year';
        ELSE
            RAISE EXCEPTION 'Plano inválido: %', p_plano;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para verificar e bloquear escolas com licenças expiradas
CREATE OR REPLACE FUNCTION verificar_licencas_expiradas()
RETURNS TABLE(escola_id UUID, escola_nome TEXT, licenca_id UUID, data_expirada DATE) AS $$
BEGIN
    -- Marcar licenças expiradas
    UPDATE licencas l
    SET estado = 'expirada', updated_at = NOW()
    WHERE estado = 'ativa' 
    AND data_fim < CURRENT_DATE;
    
    -- Bloquear escolas com licenças expiradas (que ainda não estão bloqueadas)
    UPDATE escolas e
    SET bloqueado = true,
        bloqueado_motivo = 'Licença expirada - Efectue o pagamento para reactivar o acesso',
        bloqueado_em = NOW()
    FROM licencas l
    WHERE e.id = l.escola_id
    AND l.estado = 'expirada'
    AND e.bloqueado = false
    AND NOT escola_tem_licenca_valida(e.id);
    
    -- Retornar escolas afectadas
    RETURN QUERY
    SELECT e.id, e.nome, l.id, l.data_fim
    FROM escolas e
    JOIN licencas l ON e.id = l.escola_id
    WHERE l.estado = 'expirada'
    AND l.data_fim >= CURRENT_DATE - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para activar licença após pagamento
CREATE OR REPLACE FUNCTION activar_licenca_apos_pagamento(
    p_transacao_id UUID,
    p_provider_transaction_id TEXT DEFAULT NULL
)
RETURNS licencas AS $$
DECLARE
    v_transacao transacoes_pagamento%ROWTYPE;
    v_licenca licencas%ROWTYPE;
BEGIN
    -- Obter transação
    SELECT * INTO v_transacao
    FROM transacoes_pagamento
    WHERE id = p_transacao_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transação não encontrada: %', p_transacao_id;
    END IF;
    
    -- Actualizar transação como sucesso
    UPDATE transacoes_pagamento
    SET estado = 'sucesso',
        provider_transaction_id = COALESCE(p_provider_transaction_id, provider_transaction_id),
        updated_at = NOW()
    WHERE id = p_transacao_id;
    
    -- Actualizar licença
    IF v_transacao.licenca_id IS NOT NULL THEN
        UPDATE licencas
        SET estado = 'ativa',
            data_ultimo_pagamento = NOW(),
            updated_at = NOW()
        WHERE id = v_transacao.licenca_id
        RETURNING * INTO v_licenca;
        
        -- Desbloquear escola
        UPDATE escolas
        SET bloqueado = false,
            bloqueado_motivo = NULL,
            bloqueado_em = NULL,
            bloqueado_por = NULL
        WHERE id = v_licenca.escola_id;
    END IF;
    
    RETURN v_licenca;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para SUPERADMIN criar licença manualmente
CREATE OR REPLACE FUNCTION criar_licenca_manual(
    p_escola_id UUID,
    p_plano TEXT,
    p_valor NUMERIC DEFAULT NULL,
    p_motivo TEXT DEFAULT 'Licença criada manualmente pelo SUPERADMIN'
)
RETURNS licencas AS $$
DECLARE
    v_valor NUMERIC;
    v_data_inicio DATE := CURRENT_DATE;
    v_data_fim DATE;
    v_licenca licencas%ROWTYPE;
BEGIN
    -- Verificar se é SUPERADMIN
    IF NOT is_superadmin() THEN
        RAISE EXCEPTION 'Apenas SUPERADMIN pode criar licenças manualmente';
    END IF;
    
    -- Obter valor do plano se não especificado
    IF p_valor IS NULL THEN
        SELECT valor INTO v_valor FROM precos_licenca WHERE plano = p_plano AND ativo = true;
        IF NOT FOUND THEN
            -- Valores padrão
            v_valor := CASE p_plano
                WHEN 'trimestral' THEN 15000
                WHEN 'semestral' THEN 27000
                WHEN 'anual' THEN 48000
            END;
        END IF;
    ELSE
        v_valor := p_valor;
    END IF;
    
    -- Calcular data de fim
    v_data_fim := calcular_data_fim_licenca(v_data_inicio, p_plano);
    
    -- Suspender licenças anteriores
    UPDATE licencas
    SET estado = 'cancelada', updated_at = NOW()
    WHERE escola_id = p_escola_id AND estado = 'ativa';
    
    -- Criar nova licença
    INSERT INTO licencas (escola_id, plano, data_inicio, data_fim, estado, valor, data_ultimo_pagamento, criado_por)
    VALUES (p_escola_id, p_plano, v_data_inicio, v_data_fim, 'ativa', v_valor, NOW(), auth.uid())
    RETURNING * INTO v_licenca;
    
    -- Registar transação manual
    INSERT INTO transacoes_pagamento (escola_id, licenca_id, provider, valor, estado, descricao)
    VALUES (p_escola_id, v_licenca.id, 'manual', v_valor, 'sucesso', p_motivo);
    
    -- Desbloquear escola
    UPDATE escolas
    SET bloqueado = false,
        bloqueado_motivo = NULL,
        bloqueado_em = NULL,
        bloqueado_por = NULL,
        ativo = true
    WHERE id = p_escola_id;
    
    RETURN v_licenca;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para suspender licença (SUPERADMIN)
CREATE OR REPLACE FUNCTION suspender_licenca(
    p_licenca_id UUID,
    p_motivo TEXT DEFAULT 'Suspensa pelo SUPERADMIN'
)
RETURNS licencas AS $$
DECLARE
    v_licenca licencas%ROWTYPE;
BEGIN
    IF NOT is_superadmin() THEN
        RAISE EXCEPTION 'Apenas SUPERADMIN pode suspender licenças';
    END IF;
    
    UPDATE licencas
    SET estado = 'suspensa', updated_at = NOW()
    WHERE id = p_licenca_id
    RETURNING * INTO v_licenca;
    
    -- Registar no histórico
    INSERT INTO historico_licencas (licenca_id, escola_id, estado_anterior, estado_novo, motivo, alterado_por)
    VALUES (p_licenca_id, v_licenca.escola_id, 'ativa', 'suspensa', p_motivo, auth.uid());
    
    -- Bloquear escola
    UPDATE escolas
    SET bloqueado = true,
        bloqueado_motivo = p_motivo,
        bloqueado_em = NOW(),
        bloqueado_por = auth.uid()
    WHERE id = v_licenca.escola_id;
    
    RETURN v_licenca;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE licencas ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacoes_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_licencas ENABLE ROW LEVEL SECURITY;
ALTER TABLE precos_licenca ENABLE ROW LEVEL SECURITY;

-- SUPERADMIN can do everything
CREATE POLICY "SUPERADMIN can view all licencas"
    ON licencas FOR SELECT USING (is_superadmin());

CREATE POLICY "SUPERADMIN can insert licencas"
    ON licencas FOR INSERT WITH CHECK (is_superadmin());

CREATE POLICY "SUPERADMIN can update licencas"
    ON licencas FOR UPDATE USING (is_superadmin());

CREATE POLICY "SUPERADMIN can delete licencas"
    ON licencas FOR DELETE USING (is_superadmin());

-- Escolas can view their own license
CREATE POLICY "Escolas can view own licenca"
    ON licencas FOR SELECT
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

-- SUPERADMIN policies for transacoes
CREATE POLICY "SUPERADMIN can view all transacoes"
    ON transacoes_pagamento FOR SELECT USING (is_superadmin());

CREATE POLICY "SUPERADMIN can insert transacoes"
    ON transacoes_pagamento FOR INSERT WITH CHECK (is_superadmin());

CREATE POLICY "SUPERADMIN can update transacoes"
    ON transacoes_pagamento FOR UPDATE USING (is_superadmin());

-- Escolas can view their own transactions
CREATE POLICY "Escolas can view own transacoes"
    ON transacoes_pagamento FOR SELECT
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

-- System can insert transactions (for webhooks)
CREATE POLICY "System can insert transacoes"
    ON transacoes_pagamento FOR INSERT
    WITH CHECK (true);

-- SUPERADMIN policies for historico
CREATE POLICY "SUPERADMIN can view all historico"
    ON historico_licencas FOR SELECT USING (is_superadmin());

-- Escolas can view their own history
CREATE POLICY "Escolas can view own historico"
    ON historico_licencas FOR SELECT
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

-- Precos are public for viewing
CREATE POLICY "Anyone can view precos"
    ON precos_licenca FOR SELECT USING (true);

CREATE POLICY "SUPERADMIN can manage precos"
    ON precos_licenca FOR ALL USING (is_superadmin());

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert default prices
INSERT INTO precos_licenca (plano, valor, desconto_percentual, descricao) VALUES
    ('trimestral', 15000.00, 0, 'Plano trimestral - 3 meses de acesso'),
    ('semestral', 27000.00, 10, 'Plano semestral - 6 meses de acesso (10% desconto)'),
    ('anual', 48000.00, 20, 'Plano anual - 12 meses de acesso (20% desconto)')
ON CONFLICT (plano) DO UPDATE SET
    valor = EXCLUDED.valor,
    desconto_percentual = EXCLUDED.desconto_percentual,
    descricao = EXCLUDED.descricao;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE licencas IS 'Licenças de uso do sistema por escola';
COMMENT ON TABLE transacoes_pagamento IS 'Transações de pagamento de licenças';
COMMENT ON TABLE historico_licencas IS 'Histórico de mudanças de estado das licenças';
COMMENT ON TABLE precos_licenca IS 'Tabela de preços dos planos de licença';

COMMENT ON FUNCTION escola_tem_licenca_valida IS 'Verifica se uma escola tem licença válida e não expirada';
COMMENT ON FUNCTION verificar_licencas_expiradas IS 'Verifica e bloqueia escolas com licenças expiradas (executar via cron)';
COMMENT ON FUNCTION activar_licenca_apos_pagamento IS 'Activa licença e desbloqueia escola após confirmação de pagamento';
COMMENT ON FUNCTION criar_licenca_manual IS 'Permite SUPERADMIN criar licença manualmente';
COMMENT ON FUNCTION suspender_licenca IS 'Permite SUPERADMIN suspender uma licença';

-- ============================================
-- END OF MIGRATION
-- ============================================
