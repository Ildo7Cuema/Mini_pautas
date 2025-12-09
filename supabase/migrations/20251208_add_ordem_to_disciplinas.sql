-- Migration: Add ordem field to disciplinas table
-- This allows users to customize the order of disciplines in the mini-pauta

-- Add ordem column to disciplinas table
ALTER TABLE disciplinas 
ADD COLUMN ordem INTEGER DEFAULT 1;

-- Update existing records with sequential order based on alphabetical name
-- This ensures existing disciplines get a proper initial ordering
WITH ranked_disciplinas AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY turma_id ORDER BY nome) as rn
  FROM disciplinas
)
UPDATE disciplinas d
SET ordem = rd.rn
FROM ranked_disciplinas rd
WHERE d.id = rd.id;

-- Create index for performance when ordering by turma_id and ordem
CREATE INDEX idx_disciplinas_ordem ON disciplinas(turma_id, ordem);

-- Add comment to document the column purpose
COMMENT ON COLUMN disciplinas.ordem IS 'Display order of the discipline in reports and mini-pautas';
