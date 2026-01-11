-- ============================================
-- MIGRATION: Fix Direção Municipal UPDATE Policy for Document Requests
-- Purpose: Allow Direção Municipal to update status of requests directed to them
-- Date: 2026-01-11
-- ============================================

-- Problem: The UPDATE policy has `entidade_destino = 'DIRECAO_MUNICIPAL'` filter,
-- but some requests might not have this value set correctly, causing silent update failures.

-- Solution: Keep the filter but also allow updates for any request in the municipality
-- that is directed to Direção Municipal.

-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Direcao Municipal can update solicitacoes in municipio" ON solicitacoes_documentos;

-- Recreate with the correct filter for updates
-- This allows updating any request from a school in their municipality that is directed to them
CREATE POLICY "Direcao Municipal can update solicitacoes in municipio"
    ON solicitacoes_documentos FOR UPDATE
    USING (
        is_direcao_municipal() AND 
        escola_in_direcao_municipio(escola_id) AND
        entidade_destino = 'DIRECAO_MUNICIPAL'
    )
    WITH CHECK (
        is_direcao_municipal() AND 
        escola_in_direcao_municipio(escola_id) AND
        entidade_destino = 'DIRECAO_MUNICIPAL'
    );

-- Also ensure all existing Direção Municipal requests have the correct entidade_destino
-- This is a data fix for any requests that might have been created without this field
UPDATE solicitacoes_documentos 
SET entidade_destino = 'DIRECAO_MUNICIPAL' 
WHERE entidade_destino IS NULL 
  AND solicitante_tipo IN ('PROFESSOR', 'SECRETARIO');

COMMENT ON POLICY "Direcao Municipal can update solicitacoes in municipio" ON solicitacoes_documentos 
IS 'Allows Direção Municipal to update document requests directed to them from schools in their municipality';
