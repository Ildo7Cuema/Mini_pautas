-- ============================================
-- Fix notification triggers for circulares_provinciais
-- This migration corrects the notification type and ensures
-- notifications are properly sent to municipal directorates
-- ============================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS trigger_notify_circular_provincial ON circulares_provinciais;
DROP TRIGGER IF EXISTS trigger_notify_circular_provincial_insert ON circulares_provinciais;

-- Recreate the UPDATE trigger with correct notification type
CREATE OR REPLACE FUNCTION notify_direcao_municipal_circular_provincial()
RETURNS TRIGGER AS $$
DECLARE
    direcao_record RECORD;
BEGIN
    -- Only notify when circular becomes published
    IF NEW.publicado = true AND (OLD.publicado = false OR OLD.publicado IS NULL) THEN
        -- Set publication date
        NEW.data_publicacao := COALESCE(NEW.data_publicacao, NOW());
        
        -- Notify all municipal directorates in the province
        FOR direcao_record IN 
            SELECT user_id, nome FROM direcoes_municipais 
            WHERE provincia = NEW.provincia AND ativo = true AND user_id IS NOT NULL
        LOOP
            INSERT INTO notificacoes (
                destinatario_id, 
                tipo, 
                titulo, 
                mensagem, 
                dados_adicionais
            ) VALUES (
                direcao_record.user_id,
                'nova_circular_provincial',  -- CORRECTED: was 'circular_provincial'
                CASE 
                    WHEN NEW.urgente THEN '🔴 Circular Provincial URGENTE'
                    ELSE '📜 Nova Circular Provincial'
                END,
                NEW.titulo,
                jsonb_build_object(
                    'circular_id', NEW.id,
                    'tipo', NEW.tipo,
                    'urgente', NEW.urgente,
                    'provincia', NEW.provincia
                )
            );
        END LOOP;
        
        RAISE NOTICE 'Notified % municipal directorates about circular %', 
            (SELECT COUNT(*) FROM direcoes_municipais WHERE provincia = NEW.provincia AND ativo = true AND user_id IS NOT NULL),
            NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_circular_provincial
    BEFORE UPDATE ON circulares_provinciais
    FOR EACH ROW
    EXECUTE FUNCTION notify_direcao_municipal_circular_provincial();

-- Recreate the INSERT trigger with correct notification type
CREATE OR REPLACE FUNCTION notify_circular_provincial_insert()
RETURNS TRIGGER AS $$
DECLARE
    direcao_record RECORD;
BEGIN
    IF NEW.publicado = true THEN
        -- Set publication date
        NEW.data_publicacao := COALESCE(NEW.data_publicacao, NOW());
        
        -- Notify all municipal directorates in the province
        FOR direcao_record IN 
            SELECT user_id, nome FROM direcoes_municipais 
            WHERE provincia = NEW.provincia AND ativo = true AND user_id IS NOT NULL
        LOOP
            INSERT INTO notificacoes (
                destinatario_id, 
                tipo, 
                titulo, 
                mensagem, 
                dados_adicionais
            ) VALUES (
                direcao_record.user_id,
                'nova_circular_provincial',  -- CORRECTED: was 'circular_provincial'
                CASE 
                    WHEN NEW.urgente THEN '🔴 Circular Provincial URGENTE'
                    ELSE '📜 Nova Circular Provincial'
                END,
                NEW.titulo,
                jsonb_build_object(
                    'circular_id', NEW.id,
                    'tipo', NEW.tipo,
                    'urgente', NEW.urgente,
                    'provincia', NEW.provincia
                )
            );
        END LOOP;
        
        RAISE NOTICE 'Notified % municipal directorates about new circular %', 
            (SELECT COUNT(*) FROM direcoes_municipais WHERE provincia = NEW.provincia AND ativo = true AND user_id IS NOT NULL),
            NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_circular_provincial_insert
    BEFORE INSERT ON circulares_provinciais
    FOR EACH ROW
    EXECUTE FUNCTION notify_circular_provincial_insert();

-- Also update any existing notifications with wrong type
UPDATE notificacoes 
SET tipo = 'nova_circular_provincial' 
WHERE tipo = 'circular_provincial';

-- Verify there are municipal directorates with user_id set
-- If not, the notifications won't be sent
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count 
    FROM direcoes_municipais 
    WHERE ativo = true AND user_id IS NOT NULL;
    
    IF v_count = 0 THEN
        RAISE WARNING 'No active municipal directorates with user_id set. Notifications will not be sent.';
    ELSE
        RAISE NOTICE 'Found % active municipal directorates with user_id set.', v_count;
    END IF;
END $$;
