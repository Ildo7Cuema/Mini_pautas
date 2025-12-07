-- ============================================
-- MIGRATION: Verify and Apply Trimestre Column to Notas
-- Date: 2025-12-07
-- Description: Safe migration that checks and applies trimestre field if needed
-- ============================================

-- Check if trimestre column already exists
DO $$
BEGIN
    -- Add trimestre column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notas' AND column_name = 'trimestre'
    ) THEN
        -- Step 1: Add trimestre column with default value
        ALTER TABLE notas 
        ADD COLUMN trimestre INTEGER NOT NULL DEFAULT 1 
        CHECK (trimestre IN (1, 2, 3));
        
        RAISE NOTICE 'Added trimestre column to notas table';
        
        -- Step 2: Update existing records to set trimestre based on their turma's trimestre
        UPDATE notas n
        SET trimestre = t.trimestre
        FROM turmas t
        WHERE n.turma_id = t.id;
        
        RAISE NOTICE 'Updated existing records with trimestre values';
    ELSE
        RAISE NOTICE 'Trimestre column already exists, skipping column creation';
    END IF;
    
    -- Step 3: Drop the old unique constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'notas' 
        AND constraint_name = 'unique_nota_aluno_componente'
    ) THEN
        ALTER TABLE notas DROP CONSTRAINT unique_nota_aluno_componente;
        RAISE NOTICE 'Dropped old unique constraint';
    END IF;
    
    -- Step 4: Create new unique constraint including trimestre if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'notas' 
        AND constraint_name = 'unique_nota_aluno_componente_trimestre'
    ) THEN
        ALTER TABLE notas 
        ADD CONSTRAINT unique_nota_aluno_componente_trimestre 
        UNIQUE (aluno_id, componente_id, trimestre);
        
        RAISE NOTICE 'Created new unique constraint with trimestre';
    ELSE
        RAISE NOTICE 'Unique constraint with trimestre already exists';
    END IF;
    
    -- Step 5: Add indexes for efficient querying by trimestre
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'notas' AND indexname = 'idx_notas_trimestre'
    ) THEN
        CREATE INDEX idx_notas_trimestre ON notas(trimestre);
        RAISE NOTICE 'Created index on trimestre';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'notas' AND indexname = 'idx_notas_turma_trimestre'
    ) THEN
        CREATE INDEX idx_notas_turma_trimestre ON notas(turma_id, trimestre);
        RAISE NOTICE 'Created index on turma_id and trimestre';
    END IF;
    
END $$;

-- Step 6: Add comment to document the change
COMMENT ON COLUMN notas.trimestre IS 'Trimestre (1, 2, or 3) for which this grade was recorded';

-- Verification query
SELECT 
    'Migration completed successfully!' as status,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'notas' AND column_name = 'trimestre') as trimestre_exists,
    EXISTS(SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'notas' AND constraint_name = 'unique_nota_aluno_componente_trimestre') as constraint_exists;
