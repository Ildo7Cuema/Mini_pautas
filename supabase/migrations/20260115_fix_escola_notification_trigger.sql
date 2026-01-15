-- ============================================
-- MIGRATION: Fix SuperAdmin School Notification Trigger
-- Purpose: Fix column names in notify_superadmin_new_escola function
-- The notificacoes table uses 'destinatario_id', not 'user_id'
-- Date: 2026-01-15
-- ============================================

-- Replace the function with correct column names
CREATE OR REPLACE FUNCTION notify_superadmin_new_escola()
RETURNS TRIGGER AS $$
DECLARE
    superadmin_record RECORD;
BEGIN
    -- Loop through all active SuperAdmins and create a notification for each
    FOR superadmin_record IN 
        SELECT user_id 
        FROM user_profiles 
        WHERE tipo_perfil = 'SUPERADMIN' AND ativo = true
    LOOP
        INSERT INTO notificacoes (
            destinatario_id,
            tipo,
            titulo,
            mensagem,
            dados_adicionais,
            lida
        ) VALUES (
            superadmin_record.user_id,
            'escola_nova',
            '🏫 Nova Escola Cadastrada',
            'A escola "' || NEW.nome || '" (' || NEW.provincia || ', ' || NEW.municipio || ') acabou de se cadastrar no sistema.',
            jsonb_build_object(
                'escola_id', NEW.id,
                'escola_nome', NEW.nome,
                'provincia', NEW.provincia,
                'municipio', NEW.municipio,
                'link', 'superadmin-escolas'
            ),
            false
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update comment
COMMENT ON FUNCTION notify_superadmin_new_escola() IS 'Notifies all active SuperAdmins when a new school registers in the system (fixed to use destinatario_id)';

-- ============================================
-- END OF MIGRATION
-- ============================================
