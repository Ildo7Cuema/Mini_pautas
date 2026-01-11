-- ============================================
-- MIGRATION: Fix Direção Municipal SELECT Policy for Document Requests
-- Purpose: Add entidade_destino filter to SELECT policy so Direção Municipal can view requests
-- Date: 2026-01-11
-- ============================================

-- The issue: The SELECT policy for Direção Municipal doesn't filter by entidade_destino
-- This causes requests to not appear because the policy was updated in migration 20260108
-- but only for UPDATE, not for SELECT.

-- Drop the old SELECT policy (if it exists without the filter)
DROP POLICY IF EXISTS "Direcao Municipal can view solicitacoes in municipio" ON solicitacoes_documentos;

-- Recreate with the correct filter
CREATE POLICY "Direcao Municipal can view solicitacoes in municipio"
    ON solicitacoes_documentos FOR SELECT
    USING (
        is_direcao_municipal() AND 
        escola_in_direcao_municipio(escola_id) AND
        entidade_destino = 'DIRECAO_MUNICIPAL'
    );

COMMENT ON POLICY "Direcao Municipal can view solicitacoes in municipio" ON solicitacoes_documentos 
IS 'Allows Direção Municipal to view document requests directed to them from schools in their municipality';
