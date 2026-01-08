-- Migration: Expand Professores Personal Data
-- Purpose: Add fields for automatic document generation (Angolan context)

-- Personal Information
ALTER TABLE professores ADD COLUMN IF NOT EXISTS data_nascimento DATE;
ALTER TABLE professores ADD COLUMN IF NOT EXISTS nome_pai TEXT;
ALTER TABLE professores ADD COLUMN IF NOT EXISTS nome_mae TEXT;
ALTER TABLE professores ADD COLUMN IF NOT EXISTS estado_civil TEXT CHECK (estado_civil IN ('Solteiro', 'Casado', 'Divorciado', 'Viúvo', 'União de Facto'));
ALTER TABLE professores ADD COLUMN IF NOT EXISTS numero_bi TEXT; -- Should ideally be UNIQUE, but we'll leave it loose for now to avoid migration errors on duplicates
ALTER TABLE professores ADD COLUMN IF NOT EXISTS nacionalidade TEXT DEFAULT 'Angolana';
ALTER TABLE professores ADD COLUMN IF NOT EXISTS naturalidade TEXT;

-- Address Information
ALTER TABLE professores ADD COLUMN IF NOT EXISTS provincia_residencia TEXT;
ALTER TABLE professores ADD COLUMN IF NOT EXISTS municipio_residencia TEXT;
ALTER TABLE professores ADD COLUMN IF NOT EXISTS bairro_residencia TEXT;
ALTER TABLE professores ADD COLUMN IF NOT EXISTS endereco_completo TEXT;

-- Financial and Administrative Information
ALTER TABLE professores ADD COLUMN IF NOT EXISTS iban TEXT;
ALTER TABLE professores ADD COLUMN IF NOT EXISTS banco TEXT;
ALTER TABLE professores ADD COLUMN IF NOT EXISTS numero_seguranca_social TEXT;
ALTER TABLE professores ADD COLUMN IF NOT EXISTS data_inicio_funcoes DATE;
ALTER TABLE professores ADD COLUMN IF NOT EXISTS categoria_laboral TEXT CHECK (categoria_laboral IN ('Quadro Definitivo', 'Contratado', 'Colaborador'));

-- Add comments for clarity
COMMENT ON COLUMN professores.numero_bi IS 'Bilhete de Identidade number';
COMMENT ON COLUMN professores.numero_seguranca_social IS 'INSS number';
