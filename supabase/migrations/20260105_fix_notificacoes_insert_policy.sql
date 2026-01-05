-- ============================================
-- MIGRATION: Fix Notifications INSERT Policy for ESCOLA
-- Purpose: Allow ESCOLA profile to create notifications for their professors
-- Date: 2026-01-05
-- Problem: When escola posts grades on behalf of professor, the notification
--          to the professor fails because there's no INSERT policy allowing it
-- ============================================

-- First, update the tipo constraint to include 'nota_lancada_admin'
ALTER TABLE public.notificacoes 
    DROP CONSTRAINT IF EXISTS notificacoes_tipo_check;

ALTER TABLE public.notificacoes 
    ADD CONSTRAINT notificacoes_tipo_check 
    CHECK (tipo IN ('aluno_novo', 'nota_lancada', 'nota_lancada_admin', 'nota_final_calculada', 'relatorio_gerado', 'sistema', 'escola_nova', 'atualizacao_sistema'));

-- Drop existing insert policies (for safety)
DROP POLICY IF EXISTS "Escola pode criar notificacoes" ON notificacoes;
DROP POLICY IF EXISTS "Escola pode criar notificações" ON notificacoes;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notificacoes;

-- Allow ESCOLA to create notifications for professors in their school
CREATE POLICY "Escola pode criar notificacoes"
    ON notificacoes FOR INSERT
    WITH CHECK (
        -- The sender must be an ESCOLA profile
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND tipo_perfil = 'ESCOLA'
        )
        -- The destination (user_id) must be a professor in the same school
        AND user_id IN (
            SELECT p.user_id 
            FROM professores p
            WHERE p.escola_id IN (
                SELECT up.escola_id FROM user_profiles up
                WHERE up.user_id = auth.uid() AND up.tipo_perfil = 'ESCOLA'
            )
        )
    );

-- Also allow PROFESSOR to create notifications (for future use cases)
DROP POLICY IF EXISTS "Professor pode criar notificacoes" ON notificacoes;

CREATE POLICY "Professor pode criar notificacoes"
    ON notificacoes FOR INSERT
    WITH CHECK (
        -- The sender must be a PROFESSOR profile
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND tipo_perfil = 'PROFESSOR'
        )
    );

-- Add comment for documentation
COMMENT ON POLICY "Escola pode criar notificacoes" ON notificacoes IS 'Allows schools to create notifications for their professors';
COMMENT ON POLICY "Professor pode criar notificacoes" ON notificacoes IS 'Allows professors to create notifications';

-- ============================================
-- END OF MIGRATION
-- ============================================
