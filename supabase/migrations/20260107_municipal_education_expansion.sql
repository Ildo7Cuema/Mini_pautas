-- ============================================
-- MIGRATION: Municipal Education Module Expansion
-- Purpose: Add tables for enhanced Municipal Education Direction functionality
-- Date: 2026-01-07
-- 
-- This migration is ADDITIVE and REVERSIBLE.
-- It does NOT modify any existing tables or data.
-- ============================================

-- ============================================
-- PHASE 1: Histórico Administrativo de Escolas
-- Immutable audit trail for school state changes
-- ============================================

CREATE TABLE IF NOT EXISTS historico_administrativo_escolas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    
    -- State change tracking
    estado_anterior TEXT, -- null for initial state
    estado_novo TEXT NOT NULL CHECK (estado_novo IN ('activa', 'suspensa', 'bloqueada', 'inactiva')),
    
    -- Change metadata
    motivo TEXT,
    observacoes TEXT,
    
    -- Who made the change
    alterado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    alterado_por_tipo TEXT CHECK (alterado_por_tipo IN ('DIRECAO_MUNICIPAL', 'SUPERADMIN')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_historico_admin_escola ON historico_administrativo_escolas(escola_id);
CREATE INDEX IF NOT EXISTS idx_historico_admin_data ON historico_administrativo_escolas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_historico_admin_estado ON historico_administrativo_escolas(estado_novo);

-- Audit trigger
CREATE TRIGGER audit_historico_administrativo_escolas 
    AFTER INSERT OR UPDATE OR DELETE ON historico_administrativo_escolas
    FOR EACH ROW 
    EXECUTE FUNCTION audit_trigger_function();

COMMENT ON TABLE historico_administrativo_escolas IS 'Immutable audit trail for school administrative state changes by Municipal Directorate';

-- ============================================
-- PHASE 2: Circulares Municipais
-- Official communications from Municipal Directorate
-- ============================================

CREATE TABLE IF NOT EXISTS circulares_municipais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Content
    numero_circular TEXT, -- e.g., "001/2026"
    titulo TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'circular' CHECK (tipo IN ('circular', 'aviso', 'comunicado', 'despacho')),
    
    -- Targeting
    municipio TEXT NOT NULL,
    provincia TEXT NOT NULL,
    
    -- Priority and status
    urgente BOOLEAN DEFAULT false,
    publicado BOOLEAN DEFAULT true,
    data_publicacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_validade TIMESTAMP WITH TIME ZONE, -- null = no expiry
    
    -- Attachments
    anexo_url TEXT,
    anexo_filename TEXT,
    
    -- Who created it
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_circulares_municipio ON circulares_municipais(municipio);
CREATE INDEX IF NOT EXISTS idx_circulares_provincia ON circulares_municipais(provincia);
CREATE INDEX IF NOT EXISTS idx_circulares_tipo ON circulares_municipais(tipo);
CREATE INDEX IF NOT EXISTS idx_circulares_data ON circulares_municipais(data_publicacao DESC);
CREATE INDEX IF NOT EXISTS idx_circulares_urgente ON circulares_municipais(urgente, publicado);

-- Updated_at trigger
CREATE TRIGGER update_circulares_municipais_updated_at 
    BEFORE UPDATE ON circulares_municipais
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Audit trigger
CREATE TRIGGER audit_circulares_municipais 
    AFTER INSERT OR UPDATE OR DELETE ON circulares_municipais
    FOR EACH ROW 
    EXECUTE FUNCTION audit_trigger_function();

COMMENT ON TABLE circulares_municipais IS 'Official communications (circulars, notices, announcements) from Municipal Directorate';

-- ============================================
-- PHASE 3: Leitura de Circulares
-- Track which schools have read each circular
-- ============================================

CREATE TABLE IF NOT EXISTS leitura_circulares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    circular_id UUID NOT NULL REFERENCES circulares_municipais(id) ON DELETE CASCADE,
    escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    
    -- Who read it
    lido_por UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lido_por_nome TEXT,
    lido_por_cargo TEXT,
    
    -- When
    lido_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: one read confirmation per school per circular
    CONSTRAINT unique_leitura_circular_escola UNIQUE (circular_id, escola_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leitura_circular ON leitura_circulares(circular_id);
CREATE INDEX IF NOT EXISTS idx_leitura_escola ON leitura_circulares(escola_id);
CREATE INDEX IF NOT EXISTS idx_leitura_data ON leitura_circulares(lido_em DESC);

COMMENT ON TABLE leitura_circulares IS 'Tracks which schools have confirmed reading each municipal circular';

-- ============================================
-- PHASE 4: Templates de Documentos Oficiais
-- Store in configuracoes_sistema for flexibility
-- ============================================

INSERT INTO configuracoes_sistema (chave, valor, descricao)
VALUES 
    ('template_declaracao_servico', 
     '{
        "titulo": "DECLARAÇÃO DE SERVIÇO",
        "introducao": "Para os devidos efeitos, declara-se que",
        "corpo": "{nome}, portador(a) do Bilhete de Identidade n.º {bi}, é funcionário(a) desta instituição de ensino, exercendo as funções de {cargo}, desde {data_inicio}.",
        "conclusao": "Por ser verdade e me ter sido solicitado, mandei passar a presente declaração que vai por mim assinada e autenticada com o selo branco em uso nesta Direcção.",
        "assinatura": "O(A) Director(a) Municipal de Educação",
        "campos_requeridos": ["nome", "bi", "cargo", "data_inicio", "escola"]
     }'::jsonb,
     'Template para Declaração de Serviço emitida pela Direcção Municipal')
ON CONFLICT (chave) DO NOTHING;

INSERT INTO configuracoes_sistema (chave, valor, descricao)
VALUES 
    ('template_guia_marcha', 
     '{
        "titulo": "GUIA DE MARCHA",
        "introducao": "Autoriza-se o(a) funcionário(a)",
        "corpo": "{nome}, portador(a) do Bilhete de Identidade n.º {bi}, {cargo} na {escola}, a deslocar-se a {destino}, no período de {data_inicio} a {data_fim}, para {motivo}.",
        "observacoes": "O(A) funcionário(a) deverá apresentar-se à entidade de destino no prazo máximo de 48 horas.",
        "assinatura": "O(A) Director(a) Municipal de Educação",
        "campos_requeridos": ["nome", "bi", "cargo", "escola", "destino", "data_inicio", "data_fim", "motivo"]
     }'::jsonb,
     'Template para Guia de Marcha emitida pela Direcção Municipal')
ON CONFLICT (chave) DO NOTHING;

INSERT INTO configuracoes_sistema (chave, valor, descricao)
VALUES 
    ('template_ordem_servico', 
     '{
        "titulo": "ORDEM DE SERVIÇO",
        "numero": "N.º {numero}/{ano}",
        "introducao": "Nos termos das competências que me são conferidas,",
        "corpo": "Determino que {nome}, {cargo} na {escola}, proceda à execução de {tarefa}, devendo apresentar relatório até {prazo}.",
        "fundamentacao": "Fundamentação: {fundamentacao}",
        "assinatura": "O(A) Director(a) Municipal de Educação",
        "campos_requeridos": ["numero", "ano", "nome", "cargo", "escola", "tarefa", "prazo", "fundamentacao"]
     }'::jsonb,
     'Template para Ordem de Serviço emitida pela Direcção Municipal')
ON CONFLICT (chave) DO NOTHING;

INSERT INTO configuracoes_sistema (chave, valor, descricao)
VALUES 
    ('template_declaracao_bancaria', 
     '{
        "titulo": "DECLARAÇÃO PARA FINS BANCÁRIOS",
        "introducao": "Para os devidos efeitos bancários, declara-se que",
        "corpo": "{nome}, portador(a) do Bilhete de Identidade n.º {bi}, é funcionário(a) efectivo(a) desta instituição de ensino, exercendo as funções de {cargo} na {escola}, auferindo um vencimento base mensal de {salario} Kz ({salario_extenso}).",
        "conclusao": "A presente declaração é emitida a pedido do(a) interessado(a) e destina-se exclusivamente para fins bancários.",
        "assinatura": "O(A) Director(a) Municipal de Educação",
        "campos_requeridos": ["nome", "bi", "cargo", "escola", "salario", "salario_extenso"]
     }'::jsonb,
     'Template para Declaração Bancária emitida pela Direcção Municipal')
ON CONFLICT (chave) DO NOTHING;

-- ============================================
-- PHASE 5: RLS Policies
-- ============================================

-- Enable RLS
ALTER TABLE historico_administrativo_escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE circulares_municipais ENABLE ROW LEVEL SECURITY;
ALTER TABLE leitura_circulares ENABLE ROW LEVEL SECURITY;

-- Histórico Administrativo policies
CREATE POLICY "Direcao Municipal can view historico in municipio"
    ON historico_administrativo_escolas FOR SELECT
    USING (
        is_direcao_municipal() AND 
        escola_in_direcao_municipio(escola_id)
    );

CREATE POLICY "Direcao Municipal can insert historico in municipio"
    ON historico_administrativo_escolas FOR INSERT
    WITH CHECK (
        is_direcao_municipal() AND 
        escola_in_direcao_municipio(escola_id)
    );

CREATE POLICY "SUPERADMIN can manage all historico"
    ON historico_administrativo_escolas FOR ALL
    USING (is_superadmin());

-- Circulares policies
CREATE POLICY "Anyone can view published circulares in their municipio"
    ON circulares_municipais FOR SELECT
    USING (
        publicado = true AND (
            -- Direcção Municipal can see all in their municipality
            (is_direcao_municipal() AND municipio = get_direcao_municipio())
            OR
            -- Schools can see circulares for their municipality
            EXISTS (
                SELECT 1 FROM escolas e 
                JOIN user_profiles up ON up.escola_id = e.id 
                WHERE up.user_id = auth.uid() AND e.municipio = circulares_municipais.municipio
            )
            OR
            -- SUPERADMIN can see all
            is_superadmin()
        )
    );

CREATE POLICY "Direcao Municipal can create circulares"
    ON circulares_municipais FOR INSERT
    WITH CHECK (
        is_direcao_municipal() AND 
        municipio = get_direcao_municipio() AND
        created_by = auth.uid()
    );

CREATE POLICY "Direcao Municipal can update own circulares"
    ON circulares_municipais FOR UPDATE
    USING (
        is_direcao_municipal() AND 
        municipio = get_direcao_municipio() AND
        created_by = auth.uid()
    );

CREATE POLICY "SUPERADMIN can manage all circulares"
    ON circulares_municipais FOR ALL
    USING (is_superadmin());

-- Leitura Circulares policies
CREATE POLICY "Users can view leitura for their escola"
    ON leitura_circulares FOR SELECT
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles WHERE user_id = auth.uid()
        )
        OR is_direcao_municipal()
        OR is_superadmin()
    );

CREATE POLICY "Users can insert leitura for their escola"
    ON leitura_circulares FOR INSERT
    WITH CHECK (
        escola_id IN (
            SELECT escola_id FROM user_profiles WHERE user_id = auth.uid()
        )
        AND lido_por = auth.uid()
    );

CREATE POLICY "Direcao Municipal can view all leitura in municipio"
    ON leitura_circulares FOR SELECT
    USING (
        is_direcao_municipal() AND 
        escola_in_direcao_municipio(escola_id)
    );

CREATE POLICY "SUPERADMIN can manage all leitura"
    ON leitura_circulares FOR ALL
    USING (is_superadmin());

-- ============================================
-- PHASE 6: Notification on new circular
-- ============================================

CREATE OR REPLACE FUNCTION notify_escolas_nova_circular()
RETURNS TRIGGER AS $$
DECLARE
    escola_record RECORD;
    escola_user_id UUID;
BEGIN
    -- Only notify on published circulars
    IF NEW.publicado = true THEN
        -- Get all schools in the municipality
        FOR escola_record IN 
            SELECT id, user_id, nome FROM escolas 
            WHERE municipio = NEW.municipio AND ativo = true
        LOOP
            -- Get user_id for the school
            SELECT user_id INTO escola_user_id
            FROM user_profiles
            WHERE escola_id = escola_record.id AND tipo_perfil = 'ESCOLA'
            LIMIT 1;
            
            IF escola_user_id IS NOT NULL THEN
                INSERT INTO notificacoes (
                    destinatario_id, 
                    tipo, 
                    titulo, 
                    mensagem, 
                    dados_adicionais
                ) VALUES (
                    escola_user_id,
                    'nova_circular_municipal',
                    CASE 
                        WHEN NEW.urgente THEN '🔴 ' || UPPER(NEW.tipo) || ' URGENTE'
                        ELSE '📢 Nova ' || NEW.tipo
                    END,
                    NEW.titulo,
                    jsonb_build_object(
                        'circular_id', NEW.id,
                        'tipo', NEW.tipo,
                        'urgente', NEW.urgente,
                        'numero', NEW.numero_circular
                    )
                );
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_escolas_nova_circular ON circulares_municipais;
CREATE TRIGGER trigger_notify_escolas_nova_circular
    AFTER INSERT ON circulares_municipais
    FOR EACH ROW
    EXECUTE FUNCTION notify_escolas_nova_circular();

-- ============================================
-- PHASE 7: Grant Permissions
-- ============================================

GRANT SELECT, INSERT ON historico_administrativo_escolas TO authenticated;
GRANT SELECT, INSERT, UPDATE ON circulares_municipais TO authenticated;
GRANT SELECT, INSERT ON leitura_circulares TO authenticated;

-- ============================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================
-- To rollback this migration:
-- DROP TABLE IF EXISTS leitura_circulares CASCADE;
-- DROP TABLE IF EXISTS circulares_municipais CASCADE;
-- DROP TABLE IF EXISTS historico_administrativo_escolas CASCADE;
-- DELETE FROM configuracoes_sistema WHERE chave LIKE 'template_%';
-- DROP FUNCTION IF EXISTS notify_escolas_nova_circular() CASCADE;

-- ============================================
-- END OF MIGRATION
-- ============================================
