-- Migration: Add trimestre field to componentes_avaliacao
-- This allows each component to be associated with a specific trimester
-- Components must be manually registered for each trimester through the UI

-- Step 1: Add trimestre column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'componentes_avaliacao' 
        AND column_name = 'trimestre'
    ) THEN
        ALTER TABLE componentes_avaliacao 
        ADD COLUMN trimestre INTEGER CHECK (trimestre IN (1, 2, 3));
    END IF;
END $$;

-- Step 2: Set default trimestre = 1 for existing components
-- This is temporary - users should re-register components per trimester
UPDATE componentes_avaliacao 
SET trimestre = 1 
WHERE trimestre IS NULL;

-- Step 3: Make trimestre NOT NULL
ALTER TABLE componentes_avaliacao 
ALTER COLUMN trimestre SET NOT NULL;

-- Step 4: Update unique constraint to include trimestre
-- This allows same codigo_componente in different trimesters
ALTER TABLE componentes_avaliacao 
DROP CONSTRAINT IF EXISTS unique_componente_disciplina;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_componente_disciplina_trimestre'
    ) THEN
        ALTER TABLE componentes_avaliacao 
        ADD CONSTRAINT unique_componente_disciplina_trimestre 
        UNIQUE (disciplina_id, codigo_componente, trimestre);
    END IF;
END $$;

-- Step 5: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_componentes_trimestre 
ON componentes_avaliacao(trimestre);

CREATE INDEX IF NOT EXISTS idx_componentes_disciplina_trimestre 
ON componentes_avaliacao(disciplina_id, trimestre);

-- Note: Existing components are now in trimestre 1
-- Users need to manually add components for trimesters 2 and 3 through the UI
