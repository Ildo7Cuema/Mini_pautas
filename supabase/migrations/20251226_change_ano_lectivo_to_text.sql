-- Migration: Change ano_lectivo from INTEGER to TEXT
-- Purpose: Allow year ranges like "2025/2026" in addition to single years like "2025"
-- Issue: Multiple views depend on this column

BEGIN;

-- Step 1: Find and drop ALL views that depend on the turmas table
-- This is more robust than listing them manually
DO $$
DECLARE
    view_record RECORD;
BEGIN
    -- Find all views that depend on turmas table
    FOR view_record IN 
        SELECT DISTINCT v.viewname 
        FROM pg_views v
        WHERE v.definition LIKE '%turmas%'
        AND v.schemaname = 'public'
    LOOP
        EXECUTE 'DROP VIEW IF EXISTS ' || view_record.viewname || ' CASCADE';
        RAISE NOTICE 'Dropped view: %', view_record.viewname;
    END LOOP;
END $$;

-- Step 2: Change ano_lectivo column type in turmas table
ALTER TABLE turmas 
ALTER COLUMN ano_lectivo TYPE TEXT USING ano_lectivo::TEXT;

-- Step 3: Change ano_lectivo column type in propinas_config table (if exists)
DO $$
BEGIN
    ALTER TABLE propinas_config 
    ALTER COLUMN ano_lectivo TYPE TEXT USING ano_lectivo::TEXT;
    RAISE NOTICE 'Table propinas_config updated';
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Table propinas_config does not exist, skipping';
END $$;

COMMIT;

-- ============================================
-- IMPORTANT: After running this migration
-- ============================================
-- All views that referenced the turmas table have been dropped.
-- You will need to recreate them manually if needed.
--
-- To see which views were dropped, check the migration output for "Dropped view" messages.
--
-- Common views that may need to be recreated:
-- - vw_mini_pauta
-- - vw_estatisticas_turma  
-- - vw_desempenho_aluno
--
-- You can find the view definitions in your application code or database backups.
