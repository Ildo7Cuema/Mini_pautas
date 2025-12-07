-- ============================================
-- MIGRATION: Add trimestre column to notas table
-- Date: 2025-12-07
-- Description: Adds trimestre field to enable tracking grades across multiple trimesters
-- ============================================

-- Step 1: Add trimestre column with default value
ALTER TABLE notas 
ADD COLUMN trimestre INTEGER NOT NULL DEFAULT 1 
CHECK (trimestre IN (1, 2, 3));

-- Step 2: Update existing records to set trimestre based on their turma's trimestre
UPDATE notas n
SET trimestre = t.trimestre
FROM turmas t
WHERE n.turma_id = t.id;

-- Step 3: Drop the old unique constraint
ALTER TABLE notas 
DROP CONSTRAINT IF EXISTS unique_nota_aluno_componente;

-- Step 4: Create new unique constraint including trimestre
ALTER TABLE notas 
ADD CONSTRAINT unique_nota_aluno_componente_trimestre 
UNIQUE (aluno_id, componente_id, trimestre);

-- Step 5: Add index for efficient querying by trimestre
CREATE INDEX IF NOT EXISTS idx_notas_trimestre ON notas(trimestre);
CREATE INDEX IF NOT EXISTS idx_notas_turma_trimestre ON notas(turma_id, trimestre);

-- Step 6: Add comment to document the change
COMMENT ON COLUMN notas.trimestre IS 'Trimestre (1, 2, or 3) for which this grade was recorded';

-- ============================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================
-- To rollback this migration, run:
-- 
-- ALTER TABLE notas DROP CONSTRAINT unique_nota_aluno_componente_trimestre;
-- ALTER TABLE notas ADD CONSTRAINT unique_nota_aluno_componente UNIQUE (aluno_id, componente_id);
-- DROP INDEX IF EXISTS idx_notas_trimestre;
-- DROP INDEX IF EXISTS idx_notas_turma_trimestre;
-- ALTER TABLE notas DROP COLUMN trimestre;
-- ============================================
