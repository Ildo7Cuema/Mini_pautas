-- Migration to add 'modo_exibicao' column to 'regras_cores_notas' table
-- Created at: 2026-01-17

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'regras_cores_notas'
        AND column_name = 'modo_exibicao'
    ) THEN
        ALTER TABLE regras_cores_notas
        ADD COLUMN modo_exibicao TEXT DEFAULT 'texto' CHECK (modo_exibicao IN ('texto', 'fundo'));
    END IF;
END $$;
