-- Migration: Add Genero to Funcionarios Escola
-- Purpose: Enable gender statistics for non-teaching staff

ALTER TABLE funcionarios_escola ADD COLUMN IF NOT EXISTS genero TEXT CHECK (genero IN ('M', 'F'));
ALTER TABLE funcionarios_escola ADD COLUMN IF NOT EXISTS data_nascimento DATE;
ALTER TABLE funcionarios_escola ADD COLUMN IF NOT EXISTS nif TEXT;
