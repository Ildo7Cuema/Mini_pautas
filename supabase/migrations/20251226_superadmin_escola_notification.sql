-- ============================================
-- MIGRATION: SuperAdmin School Registration Notifications
-- Purpose: Notify all SuperAdmins when a new school registers
-- Date: 2025-12-26
-- ============================================

-- Step 1: Update tipo constraint to include 'escola_nova'
ALTER TABLE public.notificacoes 
    DROP CONSTRAINT IF EXISTS notificacoes_tipo_check;

ALTER TABLE public.notificacoes 
    ADD CONSTRAINT notificacoes_tipo_check 
    CHECK (tipo IN ('aluno_novo', 'nota_lancada', 'relatorio_gerado', 'sistema', 'escola_nova'));

-- Step 2: Create function to notify all SuperAdmins of new escola registration
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
            user_id,
            escola_id,
            tipo,
            titulo,
            mensagem,
            link,
            lida
        ) VALUES (
            superadmin_record.user_id,
            NEW.id,
            'escola_nova',
            '🏫 Nova Escola Cadastrada',
            'A escola "' || NEW.nome || '" (' || NEW.provincia || ', ' || NEW.municipio || ') acabou de se cadastrar no sistema.',
            'superadmin-escolas',
            false
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create trigger that fires after escola insert
DROP TRIGGER IF EXISTS on_escola_created ON public.escolas;

CREATE TRIGGER on_escola_created
    AFTER INSERT ON public.escolas
    FOR EACH ROW
    EXECUTE FUNCTION notify_superadmin_new_escola();

-- Step 4: Add comment for documentation
COMMENT ON FUNCTION notify_superadmin_new_escola() IS 'Notifies all active SuperAdmins when a new school registers in the system';
COMMENT ON TRIGGER on_escola_created ON public.escolas IS 'Triggers SuperAdmin notification when a new escola is inserted';

-- ============================================
-- END OF MIGRATION
-- ============================================
