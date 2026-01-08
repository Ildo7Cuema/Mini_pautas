-- ============================================
-- MIGRATION: Allow School Document Requests
-- Purpose: Add ability to target doc requests to School OR Municipal Direction
-- Date: 2026-01-08
-- ============================================

-- 1. Add entidade_destino column
ALTER TABLE solicitacoes_documentos
ADD COLUMN IF NOT EXISTS entidade_destino TEXT 
CHECK (entidade_destino IN ('ESCOLA', 'DIRECAO_MUNICIPAL')) 
DEFAULT 'DIRECAO_MUNICIPAL';

COMMENT ON COLUMN solicitacoes_documentos.entidade_destino IS 'Target entity for the request (School or Municipal Directorate)';

-- 1.1 Policy: Professors can create requests
CREATE POLICY "Professors can create requests"
    ON solicitacoes_documentos FOR INSERT
    WITH CHECK (
        auth.uid() = solicitante_user_id
    );

-- 1.2 Policy: Users can view their own requests (Generic for all types)
CREATE POLICY "Users can view own requests"
    ON solicitacoes_documentos FOR SELECT
    USING (
        auth.uid() = solicitante_user_id
    );

-- 2. Update Policies for School Admins (to view/manage 'ESCOLA' requests)

-- Policy: School Admin can VIEW requests directed to their school
CREATE POLICY "School Admin can view own school requests"
    ON solicitacoes_documentos FOR SELECT
    USING (
        is_escola() AND 
        escola_id = get_user_escola_id() AND
        entidade_destino = 'ESCOLA'
    );

-- Policy: School Admin can UPDATE requests directed to their school
CREATE POLICY "School Admin can update own school requests"
    ON solicitacoes_documentos FOR UPDATE
    USING (
        is_escola() AND 
        escola_id = get_user_escola_id() AND
        entidade_destino = 'ESCOLA'
    );

-- 3. Refine Municipal Director Policies (Optional: if we want to distinguish)
-- Currently, they can view *all* in their municipality. We keep that as "Oversight".
-- But updates should probably be restricted? 
-- The existing policy "Direcao Municipal can update solicitacoes in municipio" doesn't filter by destination.
-- We should probably restrict it to only update 'DIRECAO_MUNICIPAL' requests to avoid conflict.

DROP POLICY IF EXISTS "Direcao Municipal can update solicitacoes in municipio" ON solicitacoes_documentos;

CREATE POLICY "Direcao Municipal can update solicitacoes in municipio"
    ON solicitacoes_documentos FOR UPDATE
    USING (
        is_direcao_municipal() AND 
        escola_in_direcao_municipio(escola_id) AND
        entidade_destino = 'DIRECAO_MUNICIPAL'
    );

-- 4. Notification Triggers Update
-- We need to notify the School Admin if destination is 'ESCOLA'
-- modify notify_direcao_nova_solicitacao to handle this.

CREATE OR REPLACE FUNCTION notify_nova_solicitacao_handler()
RETURNS TRIGGER AS $$
DECLARE
    escola_municipio TEXT;
    escola_user_id UUID;
    direcao_user_id UUID;
    solicitante_nome TEXT;
    tipo_doc_nome TEXT;
    escola_nome TEXT;
    target_user_id UUID;
BEGIN
    -- Get school info
    SELECT municipio, nome, user_id INTO escola_municipio, escola_nome, escola_user_id 
    FROM escolas WHERE id = NEW.escola_id;
    
    -- Get requester name
    SELECT COALESCE(
        (SELECT nome_completo FROM professores WHERE user_id = NEW.solicitante_user_id),
        (SELECT nome_completo FROM secretarios WHERE user_id = NEW.solicitante_user_id),
        (SELECT nome FROM escolas WHERE user_id = NEW.solicitante_user_id),
        'Um funcionário'
    ) INTO solicitante_nome;
    
    -- Get document type name
    SELECT nome INTO tipo_doc_nome FROM tipos_documento WHERE id = NEW.tipo_documento_id;

    -- Determine Recipient
    IF NEW.entidade_destino = 'ESCOLA' THEN
        target_user_id := escola_user_id;
    ELSE 
        -- Default to Direcao Municipal
         SELECT user_id INTO direcao_user_id 
         FROM direcoes_municipais 
         WHERE municipio = escola_municipio AND ativo = true
         LIMIT 1;
         target_user_id := direcao_user_id;
    END IF;
    
    -- Create notification if target exists
    IF target_user_id IS NOT NULL THEN
        INSERT INTO notificacoes (
            destinatario_id, 
            tipo, 
            titulo, 
            mensagem, 
            dados_adicionais
        ) VALUES (
            target_user_id,
            'nova_solicitacao_documento',
            CASE WHEN NEW.urgente THEN '🔴 Nova Solicitação URGENTE' ELSE '📋 Nova Solicitação de Documento' END,
            solicitante_nome || ' solicitou: ' || COALESCE(tipo_doc_nome, NEW.assunto),
            jsonb_build_object(
                'solicitacao_id', NEW.id,
                'escola_id', NEW.escola_id,
                'urgente', NEW.urgente,
                'entidade_destino', NEW.entidade_destino
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger (drop old one first to be safe, though name change implies new trigger)
DROP TRIGGER IF EXISTS trigger_notify_direcao_nova_solicitacao ON solicitacoes_documentos;

CREATE TRIGGER trigger_notify_nova_solicitacao
    AFTER INSERT ON solicitacoes_documentos
    FOR EACH ROW
    EXECUTE FUNCTION notify_nova_solicitacao_handler();

