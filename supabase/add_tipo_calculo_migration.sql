-- Migration: Add tipo_calculo field to componentes_avaliacao
-- This allows components to be calculated within a trimestre (MT) or across trimesters (MF)

-- Add tipo_calculo column
ALTER TABLE componentes_avaliacao 
ADD COLUMN IF NOT EXISTS tipo_calculo VARCHAR(20) DEFAULT 'trimestral' 
CHECK (tipo_calculo IN ('trimestral', 'anual'));

-- Add comment
COMMENT ON COLUMN componentes_avaliacao.tipo_calculo IS 'Tipo de cálculo: trimestral (MT - dentro do trimestre) ou anual (MF - entre trimestres)';

-- Create index
CREATE INDEX IF NOT EXISTS idx_componentes_tipo_calculo 
ON componentes_avaliacao(tipo_calculo) 
WHERE is_calculated = true;

-- Update existing calculated components to trimestral by default
UPDATE componentes_avaliacao 
SET tipo_calculo = 'trimestral' 
WHERE is_calculated = true AND tipo_calculo IS NULL;
