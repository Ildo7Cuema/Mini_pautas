-- ============================================
-- SISTEMA DE MATRÍCULAS - EduGest Angola
-- Migração: 20260106_add_matriculas_system.sql
-- Descrição: Cria tabela de matrículas para controlar
--            transição de alunos entre anos letivos
-- ============================================

-- ============================================
-- TABELA PRINCIPAL: matriculas
-- ============================================

CREATE TABLE IF NOT EXISTS matriculas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    turma_origem_id UUID REFERENCES turmas(id) ON DELETE SET NULL,
    turma_destino_id UUID REFERENCES turmas(id) ON DELETE SET NULL,
    ano_lectivo_origem TEXT NOT NULL,
    ano_lectivo_destino TEXT NOT NULL,
    
    -- Classificação baseada em studentClassification.ts
    status_transicao TEXT NOT NULL CHECK (status_transicao IN (
        'Transita', 'Não Transita', 'Condicional', 'AguardandoNotas'
    )),
    
    -- Estado atual da matrícula
    estado_matricula TEXT NOT NULL DEFAULT 'pendente' CHECK (estado_matricula IN (
        'pendente',             -- Aguardando ação do gestor
        'confirmada',           -- Matrícula confirmada para próximo ano
        'cancelada',            -- Matrícula cancelada
        'aguardando_exame',     -- Aluno condicional aguardando exame
        'exame_realizado'       -- Exame realizado, aguardando processamento
    )),
    
    -- Detalhes da classificação
    disciplinas_em_risco TEXT[],
    observacao_padronizada TEXT,
    motivo_retencao TEXT,
    media_geral NUMERIC(5,2),
    frequencia_anual NUMERIC(5,2),
    matricula_condicional BOOLEAN DEFAULT false,
    
    -- Dados do exame extraordinário
    resultado_exame TEXT CHECK (resultado_exame IN ('aprovado', 'reprovado') OR resultado_exame IS NULL),
    data_exame DATE,
    nota_exame NUMERIC(5,2),
    disciplina_exame_id UUID REFERENCES disciplinas(id) ON DELETE SET NULL,
    observacao_exame TEXT,
    
    -- Classe de destino (ex: "8ª Classe" para quem estava na 7ª)
    classe_origem TEXT,
    classe_destino TEXT,
    
    -- Auditoria
    criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    confirmado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    confirmado_em TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint para evitar duplicatas
    CONSTRAINT unique_matricula_aluno_ano UNIQUE (aluno_id, ano_lectivo_origem, ano_lectivo_destino)
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_matriculas_aluno ON matriculas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_escola ON matriculas(escola_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_turma_origem ON matriculas(turma_origem_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_turma_destino ON matriculas(turma_destino_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_ano_origem ON matriculas(ano_lectivo_origem);
CREATE INDEX IF NOT EXISTS idx_matriculas_ano_destino ON matriculas(ano_lectivo_destino);
CREATE INDEX IF NOT EXISTS idx_matriculas_estado ON matriculas(estado_matricula);
CREATE INDEX IF NOT EXISTS idx_matriculas_status ON matriculas(status_transicao);
CREATE INDEX IF NOT EXISTS idx_matriculas_escola_ano ON matriculas(escola_id, ano_lectivo_origem);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE matriculas ENABLE ROW LEVEL SECURITY;

-- Função helper para verificar se usuário pertence à escola
CREATE OR REPLACE FUNCTION user_belongs_to_escola(escola_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Verificar se é professor da escola
    IF EXISTS (
        SELECT 1 FROM professores 
        WHERE escola_id = escola_uuid AND user_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Verificar se é admin da escola (user_profile)
    IF EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE escola_id = escola_uuid AND user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Verificar se é secretário da escola
    IF EXISTS (
        SELECT 1 FROM secretarios 
        WHERE escola_id = escola_uuid AND user_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Verificar se é superadmin
    IF EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() AND tipo_perfil = 'SUPERADMIN'
    ) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Política: Usuários da escola podem ver matrículas da sua escola
CREATE POLICY "Users can view matriculas from their escola"
    ON matriculas FOR SELECT
    USING (user_belongs_to_escola(escola_id));

-- Política: Usuários da escola podem inserir matrículas
CREATE POLICY "Users can insert matriculas for their escola"
    ON matriculas FOR INSERT
    WITH CHECK (user_belongs_to_escola(escola_id));

-- Política: Usuários da escola podem atualizar matrículas
CREATE POLICY "Users can update matriculas from their escola"
    ON matriculas FOR UPDATE
    USING (user_belongs_to_escola(escola_id));

-- Política: Apenas admin/escola podem deletar matrículas
CREATE POLICY "Admins can delete matriculas"
    ON matriculas FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND escola_id = matriculas.escola_id 
            AND tipo_perfil IN ('ESCOLA', 'SUPERADMIN')
        )
    );

-- ============================================
-- TRIGGER: Atualizar updated_at
-- ============================================

CREATE TRIGGER update_matriculas_updated_at 
    BEFORE UPDATE ON matriculas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRIGGER: Auditoria de matrículas
-- ============================================

CREATE TRIGGER audit_matriculas 
    AFTER INSERT OR UPDATE OR DELETE ON matriculas
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- FUNÇÃO: Gerar matrículas pendentes para uma turma
-- ============================================

CREATE OR REPLACE FUNCTION gerar_matriculas_pendentes(
    p_turma_id UUID,
    p_ano_lectivo_destino TEXT
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_turma RECORD;
    v_aluno RECORD;
    v_classificacao RECORD;
BEGIN
    -- Buscar dados da turma
    SELECT id, escola_id, ano_lectivo, nivel_ensino, nome INTO v_turma
    FROM turmas WHERE id = p_turma_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Turma não encontrada: %', p_turma_id;
    END IF;
    
    -- Para cada aluno ativo da turma
    FOR v_aluno IN 
        SELECT a.id, a.numero_processo, a.frequencia_anual
        FROM alunos a
        WHERE a.turma_id = p_turma_id AND a.ativo = true
    LOOP
        -- Verificar se já existe matrícula para este aluno/ano
        IF NOT EXISTS (
            SELECT 1 FROM matriculas 
            WHERE aluno_id = v_aluno.id 
            AND ano_lectivo_origem = v_turma.ano_lectivo::TEXT
            AND ano_lectivo_destino = p_ano_lectivo_destino
        ) THEN
            -- Inserir matrícula pendente
            -- Nota: A classificação será calculada no frontend
            INSERT INTO matriculas (
                aluno_id,
                escola_id,
                turma_origem_id,
                ano_lectivo_origem,
                ano_lectivo_destino,
                status_transicao,
                estado_matricula,
                frequencia_anual,
                criado_por
            ) VALUES (
                v_aluno.id,
                v_turma.escola_id,
                p_turma_id,
                v_turma.ano_lectivo::TEXT,
                p_ano_lectivo_destino,
                'AguardandoNotas', -- Será atualizado pelo frontend
                'pendente',
                v_aluno.frequencia_anual,
                auth.uid()
            );
            
            v_count := v_count + 1;
        END IF;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNÇÃO: Confirmar matrícula individual
-- ============================================

CREATE OR REPLACE FUNCTION confirmar_matricula(
    p_matricula_id UUID,
    p_turma_destino_id UUID,
    p_classe_destino TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_matricula RECORD;
BEGIN
    -- Buscar matrícula
    SELECT * INTO v_matricula 
    FROM matriculas 
    WHERE id = p_matricula_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Matrícula não encontrada: %', p_matricula_id;
    END IF;
    
    -- Verificar se está pendente
    IF v_matricula.estado_matricula != 'pendente' AND v_matricula.estado_matricula != 'exame_realizado' THEN
        RAISE EXCEPTION 'Matrícula já processada. Estado atual: %', v_matricula.estado_matricula;
    END IF;
    
    -- Atualizar matrícula
    UPDATE matriculas SET
        turma_destino_id = p_turma_destino_id,
        classe_destino = p_classe_destino,
        estado_matricula = 'confirmada',
        confirmado_por = auth.uid(),
        confirmado_em = NOW(),
        updated_at = NOW()
    WHERE id = p_matricula_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNÇÃO: Registrar resultado de exame
-- ============================================

CREATE OR REPLACE FUNCTION registrar_resultado_exame(
    p_matricula_id UUID,
    p_resultado TEXT,
    p_nota NUMERIC,
    p_data_exame DATE DEFAULT CURRENT_DATE,
    p_observacao TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Validar resultado
    IF p_resultado NOT IN ('aprovado', 'reprovado') THEN
        RAISE EXCEPTION 'Resultado inválido. Use "aprovado" ou "reprovado"';
    END IF;
    
    -- Atualizar matrícula
    UPDATE matriculas SET
        resultado_exame = p_resultado,
        nota_exame = p_nota,
        data_exame = p_data_exame,
        observacao_exame = p_observacao,
        estado_matricula = 'exame_realizado',
        -- Se aprovado, muda status para Transita
        status_transicao = CASE WHEN p_resultado = 'aprovado' THEN 'Transita' ELSE 'Não Transita' END,
        updated_at = NOW()
    WHERE id = p_matricula_id
    AND estado_matricula = 'aguardando_exame';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Matrícula não encontrada ou não está aguardando exame';
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VIEW: Resumo de matrículas por escola
-- ============================================

CREATE OR REPLACE VIEW vw_resumo_matriculas AS
SELECT 
    m.escola_id,
    m.ano_lectivo_origem,
    m.ano_lectivo_destino,
    t.nome as turma_nome,
    t.nivel_ensino,
    COUNT(*) as total_alunos,
    COUNT(*) FILTER (WHERE m.status_transicao = 'Transita') as transitados,
    COUNT(*) FILTER (WHERE m.status_transicao = 'Não Transita') as nao_transitados,
    COUNT(*) FILTER (WHERE m.status_transicao = 'Condicional') as condicionais,
    COUNT(*) FILTER (WHERE m.estado_matricula = 'pendente') as pendentes,
    COUNT(*) FILTER (WHERE m.estado_matricula = 'confirmada') as confirmadas,
    COUNT(*) FILTER (WHERE m.estado_matricula = 'aguardando_exame') as aguardando_exame
FROM matriculas m
LEFT JOIN turmas t ON t.id = m.turma_origem_id
GROUP BY m.escola_id, m.ano_lectivo_origem, m.ano_lectivo_destino, t.nome, t.nivel_ensino;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON matriculas TO authenticated;
GRANT SELECT ON vw_resumo_matriculas TO authenticated;

-- ============================================
-- FIM DA MIGRAÇÃO
-- ============================================
