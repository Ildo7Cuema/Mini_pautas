-- ============================================
-- MIGRATION: Notify Approver on Request Update
-- Purpose: Notify Direcção Municipal/Escola when Requester updates the request
-- Date: 2026-01-08
-- ============================================

CREATE OR REPLACE FUNCTION notify_approver_on_update()
RETURNS TRIGGER AS $$
DECLARE
    escola_municipio TEXT;
    escola_user_id UUID;
    direcao_user_id UUID;
    solicitante_nome TEXT;
    target_user_id UUID;
    changes_summary TEXT := '';
BEGIN
    -- Only proceed if the UPDATE was done by the REQUESTER (not the approver)
    -- and if meaningful fields changed (descricao, dados_adicionais, urgente)
    IF auth.uid() = NEW.solicitante_user_id AND (
       OLD.descricao IS DISTINCT FROM NEW.descricao OR
       OLD.dados_adicionais IS DISTINCT FROM NEW.dados_adicionais OR
       OLD.urgente IS DISTINCT FROM NEW.urgente
    ) THEN
        
        -- Build summary of changes
        IF OLD.urgente IS DISTINCT FROM NEW.urgente THEN
            IF NEW.urgente THEN
                changes_summary := changes_summary || ' [Marcado como Urgente]';
            ELSE
                changes_summary := changes_summary || ' [Removido Urgente]';
            END IF;
        END IF;

        IF OLD.descricao IS DISTINCT FROM NEW.descricao THEN
             changes_summary := changes_summary || ' [Descrição atualizada]';
        END IF;

        -- Get school info
        SELECT municipio, user_id INTO escola_municipio, escola_user_id 
        FROM escolas WHERE id = NEW.escola_id;

        -- Determine Recipient (Same logic as CREATE)
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

        -- Get requester name for the message
        SELECT COALESCE(
            (SELECT nome_completo FROM professores WHERE user_id = NEW.solicitante_user_id),
            (SELECT nome_completo FROM secretarios WHERE user_id = NEW.solicitante_user_id),
            (SELECT nome FROM escolas WHERE user_id = NEW.solicitante_user_id),
            'Solicitante'
        ) INTO solicitante_nome;

        -- Create notification
        IF target_user_id IS NOT NULL THEN
            INSERT INTO notificacoes (
                destinatario_id, 
                tipo, 
                titulo, 
                mensagem, 
                link,
                dados_adicionais
            ) VALUES (
                target_user_id,
                'solicitacao_atualizada',
                '📝 Solicitação Atualizada',
                solicitante_nome || ' atualizou a solicitação.' || changes_summary,
                '/solicitacoes',
                jsonb_build_object(
                    'solicitacao_id', NEW.id,
                    'escola_id', NEW.escola_id,
                    'changes', changes_summary
                )
            );
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_approver_update ON solicitacoes_documentos;

CREATE TRIGGER trigger_notify_approver_update
    AFTER UPDATE ON solicitacoes_documentos
    FOR EACH ROW
    EXECUTE FUNCTION notify_approver_on_update();

-- Add 'solicitacao_atualizada' to the check constraint if strictly enforced
-- checking existing constraint first...
DO $$
BEGIN
    ALTER TABLE public.notificacoes 
    DROP CONSTRAINT IF EXISTS notificacoes_tipo_check;
    
    ALTER TABLE public.notificacoes 
    ADD CONSTRAINT notificacoes_tipo_check 
    CHECK (tipo IN (
        'aluno_novo', 
        'nota_lancada', 
        'nota_lancada_admin', 
        'nota_final_calculada', 
        'relatorio_gerado', 
        'sistema', 
        'escola_nova', 
        'atualizacao_sistema',
        'nova_solicitacao_documento',   -- Added this previously? Double checking
        'solicitacao_status_change',    -- Added previously
        'solicitacao_atualizada'        -- NEW
    ));
END $$;
