-- Migration: Clean up component codes - remove _T1, _T2, _T3 suffixes
-- This fixes components that were incorrectly created with trimestre suffixes

-- Remove _T1, _T2, _T3 suffixes from codigo_componente
UPDATE componentes_avaliacao
SET codigo_componente = REGEXP_REPLACE(codigo_componente, '_T[123]$', '')
WHERE codigo_componente ~ '_T[123]$';

-- Note: This will clean up component codes like:
-- MAC_T1 -> MAC
-- NPT_T2 -> NPT
-- PP_T3 -> PP
