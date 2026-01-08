-- ============================================
-- MIGRATION: Add Direção Municipal System
-- Purpose: Add municipal education directorate role with document request system
-- Date: 2026-01-07
-- ============================================

-- ============================================
-- PHASE 1: Create direcoes_municipais table
-- ============================================

CREATE TABLE IF NOT EXISTS direcoes_municipais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    provincia TEXT NOT NULL,
    municipio TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT,
    cargo TEXT DEFAULT 'Director Municipal de Educação',
    numero_funcionario TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_direcoes_municipais_municipio ON direcoes_municipais(municipio);
CREATE INDEX IF NOT EXISTS idx_direcoes_municipais_provincia ON direcoes_municipais(provincia);
CREATE INDEX IF NOT EXISTS idx_direcoes_municipais_user_id ON direcoes_municipais(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_direcoes_municipais_email ON direcoes_municipais(email);

-- Add updated_at trigger
CREATE TRIGGER update_direcoes_municipais_updated_at 
    BEFORE UPDATE ON direcoes_municipais
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add audit trigger
CREATE TRIGGER audit_direcoes_municipais 
    AFTER INSERT OR UPDATE OR DELETE ON direcoes_municipais
    FOR EACH ROW 
    EXECUTE FUNCTION audit_trigger_function();

-- Comments
COMMENT ON TABLE direcoes_municipais IS 'Municipal Education Directorates - supervise all schools in their municipality';
COMMENT ON COLUMN direcoes_municipais.municipio IS 'Municipality this directorate manages';

-- ============================================
-- PHASE 2: Update user_profiles constraints
-- ============================================

-- Drop existing constraints
ALTER TABLE user_profiles 
    DROP CONSTRAINT IF EXISTS user_profiles_tipo_perfil_check;

ALTER TABLE user_profiles 
    DROP CONSTRAINT IF EXISTS user_profiles_superadmin_escola_check;

-- Add new tipo_perfil constraint with DIRECAO_MUNICIPAL
ALTER TABLE user_profiles 
    ADD CONSTRAINT user_profiles_tipo_perfil_check 
    CHECK (tipo_perfil IN ('ESCOLA', 'PROFESSOR', 'SUPERADMIN', 'ALUNO', 'ENCARREGADO', 'SECRETARIO', 'DIRECAO_MUNICIPAL'));

-- Add new escola_id constraint (null for SUPERADMIN and DIRECAO_MUNICIPAL)
ALTER TABLE user_profiles 
    ADD CONSTRAINT user_profiles_escola_check 
    CHECK (
        (tipo_perfil IN ('SUPERADMIN', 'DIRECAO_MUNICIPAL') AND escola_id IS NULL) OR 
        (tipo_perfil NOT IN ('SUPERADMIN', 'DIRECAO_MUNICIPAL') AND escola_id IS NOT NULL)
    );

-- ============================================
-- PHASE 3: Create tipos_documento table
-- ============================================

CREATE TABLE IF NOT EXISTS tipos_documento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    descricao TEXT,
    campos_requeridos JSONB DEFAULT '[]'::jsonb,
    prazo_dias INTEGER DEFAULT 5,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default document types
INSERT INTO tipos_documento (codigo, nome, descricao, prazo_dias) VALUES
    ('DECLARACAO_TRABALHO', 'Declaração de Trabalho', 'Confirma vínculo empregatício com a escola', 3),
    ('DECLARACAO_SERVICO', 'Declaração de Tempo de Serviço', 'Declara anos de serviço na educação', 5),
    ('CERTIFICADO_FORMACAO', 'Certificado de Formação', 'Confirma participação em formações', 7),
    ('AUTORIZACAO_LICENCA', 'Autorização de Licença', 'Autorização para licença (maternidade, sem vencimento, etc.)', 10),
    ('TRANSFERENCIA', 'Pedido de Transferência', 'Transferência entre escolas do município', 15),
    ('OUTRO', 'Outro Documento', 'Solicitação de documento não listado', 7)
ON CONFLICT (codigo) DO NOTHING;

COMMENT ON TABLE tipos_documento IS 'Types of documents that can be requested from Municipal Directorate';

-- ============================================
-- PHASE 4: Create solicitacoes_documentos table
-- ============================================

CREATE TABLE IF NOT EXISTS solicitacoes_documentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Who is requesting
    solicitante_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    solicitante_tipo TEXT NOT NULL CHECK (solicitante_tipo IN ('PROFESSOR', 'SECRETARIO', 'ESCOLA')),
    escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    
    -- Document type
    tipo_documento_id UUID NOT NULL REFERENCES tipos_documento(id),
    
    -- Request details
    assunto TEXT NOT NULL,
    descricao TEXT,
    urgente BOOLEAN DEFAULT false,
    dados_adicionais JSONB DEFAULT '{}'::jsonb,
    
    -- Status and workflow
    estado TEXT NOT NULL DEFAULT 'pendente' CHECK (estado IN (
        'pendente',           -- Waiting for analysis
        'em_analise',         -- Being analyzed by Municipal Directorate
        'pendente_info',      -- Waiting for more info from requester
        'aprovado',           -- Approved
        'rejeitado',          -- Rejected
        'concluido'           -- Document delivered
    )),
    
    -- Municipal Directorate response
    resposta_direcao TEXT,
    documento_url TEXT,
    documento_filename TEXT,
    
    -- Audit fields
    analisado_por UUID REFERENCES auth.users(id),
    analisado_em TIMESTAMP WITH TIME ZONE,
    concluido_em TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_solicitacoes_escola ON solicitacoes_documentos(escola_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_estado ON solicitacoes_documentos(estado);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_solicitante ON solicitacoes_documentos(solicitante_user_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_data ON solicitacoes_documentos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_urgente ON solicitacoes_documentos(urgente, estado);

-- Add updated_at trigger
CREATE TRIGGER update_solicitacoes_documentos_updated_at 
    BEFORE UPDATE ON solicitacoes_documentos
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add audit trigger
CREATE TRIGGER audit_solicitacoes_documentos 
    AFTER INSERT OR UPDATE OR DELETE ON solicitacoes_documentos
    FOR EACH ROW 
    EXECUTE FUNCTION audit_trigger_function();

COMMENT ON TABLE solicitacoes_documentos IS 'Document requests from school staff to Municipal Directorate';

-- ============================================
-- PHASE 5: Helper Functions
-- ============================================

-- Check if current user is Direção Municipal
CREATE OR REPLACE FUNCTION is_direcao_municipal()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND tipo_perfil = 'DIRECAO_MUNICIPAL' 
        AND ativo = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get the municipality of the current Direção Municipal user
CREATE OR REPLACE FUNCTION get_direcao_municipio()
RETURNS TEXT AS $$
DECLARE
    municipio_result TEXT;
BEGIN
    SELECT dm.municipio INTO municipio_result
    FROM direcoes_municipais dm
    WHERE dm.user_id = auth.uid() 
    AND dm.ativo = true
    LIMIT 1;
    
    RETURN municipio_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if a school belongs to the current user's municipality
CREATE OR REPLACE FUNCTION escola_in_direcao_municipio(escola_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_municipio TEXT;
BEGIN
    user_municipio := get_direcao_municipio();
    
    IF user_municipio IS NULL THEN
        RETURN false;
    END IF;
    
    RETURN EXISTS (
        SELECT 1 FROM escolas e
        WHERE e.id = escola_uuid
        AND e.municipio = user_municipio
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to create Direção Municipal profile automatically
CREATE OR REPLACE FUNCTION create_direcao_municipal_profile()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS NOT NULL THEN
        INSERT INTO user_profiles (user_id, tipo_perfil, escola_id, ativo)
        VALUES (NEW.user_id, 'DIRECAO_MUNICIPAL', NULL, NEW.ativo)
        ON CONFLICT (user_id) DO UPDATE 
        SET tipo_perfil = 'DIRECAO_MUNICIPAL', ativo = NEW.ativo, escola_id = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile automatically
CREATE TRIGGER trigger_create_direcao_municipal_profile
    AFTER INSERT OR UPDATE OF user_id, ativo ON direcoes_municipais
    FOR EACH ROW
    EXECUTE FUNCTION create_direcao_municipal_profile();

-- ============================================
-- PHASE 6: RLS Policies for direcoes_municipais
-- ============================================

ALTER TABLE direcoes_municipais ENABLE ROW LEVEL SECURITY;

-- Direção Municipal can view own profile
CREATE POLICY "Direcao Municipal can view own profile"
    ON direcoes_municipais FOR SELECT
    USING (user_id = auth.uid());

-- Direção Municipal can update own profile
CREATE POLICY "Direcao Municipal can update own profile"
    ON direcoes_municipais FOR UPDATE
    USING (user_id = auth.uid());

-- SUPERADMIN can manage all
CREATE POLICY "SUPERADMIN can manage all direcoes_municipais"
    ON direcoes_municipais FOR ALL
    USING (is_superadmin());

-- ============================================
-- PHASE 7: RLS Policies for escolas (Direção Municipal)
-- ============================================

-- Direção Municipal can VIEW schools in their municipality
CREATE POLICY "Direcao Municipal can view escolas in municipio"
    ON escolas FOR SELECT
    USING (is_direcao_municipal() AND municipio = get_direcao_municipio());

-- Direção Municipal can UPDATE schools in their municipality
CREATE POLICY "Direcao Municipal can update escolas in municipio"
    ON escolas FOR UPDATE
    USING (is_direcao_municipal() AND municipio = get_direcao_municipio());

-- ============================================
-- PHASE 8: RLS Policies for related tables (Direção Municipal READ access)
-- ============================================

-- Turmas: Direção Municipal can view turmas from schools in their municipality
CREATE POLICY "Direcao Municipal can view turmas in municipio"
    ON turmas FOR SELECT
    USING (
        is_direcao_municipal() AND 
        escola_in_direcao_municipio(escola_id)
    );

-- Alunos: Direção Municipal can view alunos from schools in their municipality
CREATE POLICY "Direcao Municipal can view alunos in municipio"
    ON alunos FOR SELECT
    USING (
        is_direcao_municipal() AND 
        turma_id IN (
            SELECT t.id FROM turmas t 
            WHERE escola_in_direcao_municipio(t.escola_id)
        )
    );

-- Professores: Direção Municipal can view professores from schools in their municipality
CREATE POLICY "Direcao Municipal can view professores in municipio"
    ON professores FOR SELECT
    USING (
        is_direcao_municipal() AND 
        escola_in_direcao_municipio(escola_id)
    );

-- Disciplinas: Direção Municipal can view disciplinas from schools in their municipality
CREATE POLICY "Direcao Municipal can view disciplinas in municipio"
    ON disciplinas FOR SELECT
    USING (
        is_direcao_municipal() AND 
        turma_id IN (
            SELECT t.id FROM turmas t 
            WHERE escola_in_direcao_municipio(t.escola_id)
        )
    );

-- Notas: Direção Municipal can view notas from schools in their municipality
CREATE POLICY "Direcao Municipal can view notas in municipio"
    ON notas FOR SELECT
    USING (
        is_direcao_municipal() AND 
        turma_id IN (
            SELECT t.id FROM turmas t 
            WHERE escola_in_direcao_municipio(t.escola_id)
        )
    );

-- Notas Finais: Direção Municipal can view notas_finais from schools in their municipality
CREATE POLICY "Direcao Municipal can view notas_finais in municipio"
    ON notas_finais FOR SELECT
    USING (
        is_direcao_municipal() AND 
        turma_id IN (
            SELECT t.id FROM turmas t 
            WHERE escola_in_direcao_municipio(t.escola_id)
        )
    );

-- User Profiles: Direção Municipal can view user profiles from their municipality
CREATE POLICY "Direcao Municipal can view user_profiles in municipio"
    ON user_profiles FOR SELECT
    USING (
        is_direcao_municipal() AND (
            escola_id IN (
                SELECT e.id FROM escolas e 
                WHERE e.municipio = get_direcao_municipio()
            )
            OR user_id = auth.uid()
        )
    );

-- ============================================
-- PHASE 9: RLS Policies for tipos_documento
-- ============================================

ALTER TABLE tipos_documento ENABLE ROW LEVEL SECURITY;

-- Everyone can view active document types
CREATE POLICY "Anyone can view active tipos_documento"
    ON tipos_documento FOR SELECT
    USING (ativo = true);

-- SUPERADMIN can manage all
CREATE POLICY "SUPERADMIN can manage tipos_documento"
    ON tipos_documento FOR ALL
    USING (is_superadmin());

-- ============================================
-- PHASE 10: RLS Policies for solicitacoes_documentos
-- ============================================

ALTER TABLE solicitacoes_documentos ENABLE ROW LEVEL SECURITY;

-- Requesters can view their own requests
CREATE POLICY "Users can view own solicitacoes"
    ON solicitacoes_documentos FOR SELECT
    USING (solicitante_user_id = auth.uid());

-- Requesters can create requests
CREATE POLICY "Users can create solicitacoes"
    ON solicitacoes_documentos FOR INSERT
    WITH CHECK (solicitante_user_id = auth.uid());

-- Requesters can update their pending requests (e.g., add more info)
CREATE POLICY "Users can update own pending solicitacoes"
    ON solicitacoes_documentos FOR UPDATE
    USING (
        solicitante_user_id = auth.uid() AND 
        estado IN ('pendente', 'pendente_info')
    );

-- Direção Municipal can view all requests from schools in their municipality
CREATE POLICY "Direcao Municipal can view solicitacoes in municipio"
    ON solicitacoes_documentos FOR SELECT
    USING (
        is_direcao_municipal() AND 
        escola_in_direcao_municipio(escola_id)
    );

-- Direção Municipal can update requests from schools in their municipality
CREATE POLICY "Direcao Municipal can update solicitacoes in municipio"
    ON solicitacoes_documentos FOR UPDATE
    USING (
        is_direcao_municipal() AND 
        escola_in_direcao_municipio(escola_id)
    );

-- SUPERADMIN can manage all requests
CREATE POLICY "SUPERADMIN can manage all solicitacoes"
    ON solicitacoes_documentos FOR ALL
    USING (is_superadmin());

-- ============================================
-- PHASE 11: Notification Triggers
-- ============================================

-- Notify Municipal Directorate when new request is created
CREATE OR REPLACE FUNCTION notify_direcao_nova_solicitacao()
RETURNS TRIGGER AS $$
DECLARE
    escola_municipio TEXT;
    direcao_user_id UUID;
    solicitante_nome TEXT;
    tipo_doc_nome TEXT;
    escola_nome TEXT;
BEGIN
    -- Get school municipality and name
    SELECT municipio, nome INTO escola_municipio, escola_nome 
    FROM escolas WHERE id = NEW.escola_id;
    
    -- Get user_id of the Municipal Directorate
    SELECT user_id INTO direcao_user_id 
    FROM direcoes_municipais 
    WHERE municipio = escola_municipio AND ativo = true
    LIMIT 1;
    
    -- Get requester name
    SELECT COALESCE(
        (SELECT nome_completo FROM professores WHERE user_id = NEW.solicitante_user_id),
        (SELECT nome_completo FROM secretarios WHERE user_id = NEW.solicitante_user_id),
        (SELECT nome FROM escolas WHERE user_id = NEW.solicitante_user_id),
        'Um funcionário'
    ) INTO solicitante_nome;
    
    -- Get document type name
    SELECT nome INTO tipo_doc_nome FROM tipos_documento WHERE id = NEW.tipo_documento_id;
    
    -- Create notification if directorate exists
    IF direcao_user_id IS NOT NULL THEN
        INSERT INTO notificacoes (
            destinatario_id, 
            tipo, 
            titulo, 
            mensagem, 
            dados_adicionais
        ) VALUES (
            direcao_user_id,
            'nova_solicitacao_documento',
            CASE WHEN NEW.urgente THEN '🔴 Nova Solicitação URGENTE' ELSE '📋 Nova Solicitação de Documento' END,
            solicitante_nome || ' (' || escola_nome || ') solicitou: ' || COALESCE(tipo_doc_nome, NEW.assunto),
            jsonb_build_object(
                'solicitacao_id', NEW.id,
                'escola_id', NEW.escola_id,
                'escola_nome', escola_nome,
                'urgente', NEW.urgente,
                'tipo_documento', tipo_doc_nome
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_direcao_nova_solicitacao ON solicitacoes_documentos;
CREATE TRIGGER trigger_notify_direcao_nova_solicitacao
    AFTER INSERT ON solicitacoes_documentos
    FOR EACH ROW
    EXECUTE FUNCTION notify_direcao_nova_solicitacao();

-- Notify requester when status changes
CREATE OR REPLACE FUNCTION notify_solicitante_status_change()
RETURNS TRIGGER AS $$
DECLARE
    status_message TEXT;
    status_titulo TEXT;
BEGIN
    IF OLD.estado IS DISTINCT FROM NEW.estado THEN
        CASE NEW.estado
            WHEN 'em_analise' THEN 
                status_titulo := '🔍 Solicitação em Análise';
                status_message := 'Sua solicitação está sendo analisada pela Direção Municipal';
            WHEN 'pendente_info' THEN 
                status_titulo := '⚠️ Informações Adicionais Necessárias';
                status_message := 'A Direção Municipal precisa de mais informações: ' || COALESCE(NEW.resposta_direcao, '');
            WHEN 'aprovado' THEN 
                status_titulo := '✅ Solicitação Aprovada';
                status_message := 'Sua solicitação foi aprovada! ' || COALESCE(NEW.resposta_direcao, '');
            WHEN 'rejeitado' THEN 
                status_titulo := '❌ Solicitação Rejeitada';
                status_message := 'Sua solicitação foi rejeitada. Motivo: ' || COALESCE(NEW.resposta_direcao, 'Não especificado');
            WHEN 'concluido' THEN 
                status_titulo := '📄 Documento Pronto';
                status_message := 'Seu documento está pronto para retirada';
            ELSE 
                status_titulo := '📋 Atualização de Solicitação';
                status_message := 'O status da sua solicitação foi atualizado';
        END CASE;
        
        INSERT INTO notificacoes (
            destinatario_id, 
            tipo, 
            titulo, 
            mensagem, 
            dados_adicionais
        ) VALUES (
            NEW.solicitante_user_id,
            'solicitacao_status_change',
            status_titulo,
            status_message,
            jsonb_build_object(
                'solicitacao_id', NEW.id,
                'estado_anterior', OLD.estado,
                'estado_novo', NEW.estado,
                'resposta', NEW.resposta_direcao,
                'documento_url', NEW.documento_url
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_solicitante_status ON solicitacoes_documentos;
CREATE TRIGGER trigger_notify_solicitante_status
    AFTER UPDATE ON solicitacoes_documentos
    FOR EACH ROW
    EXECUTE FUNCTION notify_solicitante_status_change();

-- ============================================
-- PHASE 12: Grant Permissions
-- ============================================

GRANT SELECT, INSERT, UPDATE ON direcoes_municipais TO authenticated;
GRANT SELECT ON tipos_documento TO authenticated;
GRANT SELECT, INSERT, UPDATE ON solicitacoes_documentos TO authenticated;

-- ============================================
-- END OF MIGRATION
-- ============================================
