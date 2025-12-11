-- ================================================
-- Migration: Expand Alunos Table with Additional Fields
-- Run this SQL in your Supabase SQL Editor
-- ================================================

-- Dados Pessoais
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS nacionalidade VARCHAR(100);
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS naturalidade VARCHAR(100);
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(50);
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS numero_documento VARCHAR(50);

-- Dados do Encarregado/Responsável
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS nome_pai VARCHAR(255);
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS nome_mae VARCHAR(255);
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS parentesco_encarregado VARCHAR(50);
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS profissao_encarregado VARCHAR(100);

-- Endereço/Morada
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS provincia VARCHAR(100);
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS municipio VARCHAR(100);
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS bairro VARCHAR(100);
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS rua VARCHAR(255);

-- Dados Acadêmicos
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS ano_ingresso INTEGER;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS escola_anterior VARCHAR(255);
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS classe_anterior VARCHAR(50);
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS observacoes_academicas TEXT;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'alunos'
ORDER BY ordinal_position;
