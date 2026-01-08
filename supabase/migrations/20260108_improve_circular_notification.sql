-- Migration: Improve notification content for circulars
-- Purpose: Include both title and content in notification message
-- Date: 2026-01-08

CREATE OR REPLACE FUNCTION notify_escolas_nova_circular()
RETURNS TRIGGER AS $$
DECLARE
    escola_record RECORD;
    escola_user_id UUID;
    notification_message TEXT;
BEGIN
    -- Only notify on published circulars
    IF NEW.publicado = true THEN
        -- Build the notification message with title and content
        notification_message := NEW.titulo || E'\n\n' || LEFT(NEW.conteudo, 500);
        IF LENGTH(NEW.conteudo) > 500 THEN
            notification_message := notification_message || '...';
        END IF;
        
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
                    notification_message,
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
