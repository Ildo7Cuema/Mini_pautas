-- PARTE 4: Adicionar constraints únicos na base de dados
-- Execute esta parte para garantir unicidade de dados

-- Garantir que email da escola é único (se ainda não existir)
CREATE UNIQUE INDEX IF NOT EXISTS idx_escolas_email_unique ON escolas(email) WHERE email IS NOT NULL;

-- Garantir que telefone da escola é único (se ainda não existir)
CREATE UNIQUE INDEX IF NOT EXISTS idx_escolas_telefone_unique ON escolas(telefone) WHERE telefone IS NOT NULL;

-- O codigo_escola já tem constraint UNIQUE no schema original
