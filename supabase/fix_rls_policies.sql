-- Script para verificar e corrigir políticas RLS na tabela professores

-- 1. Verificar se RLS está ativado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'professores';

-- 2. Ver políticas existentes
SELECT * FROM pg_policies WHERE tablename = 'professores';

-- 3. Desativar RLS temporariamente para teste (APENAS PARA DIAGNÓSTICO)
-- ALTER TABLE professores DISABLE ROW LEVEL SECURITY;

-- 4. Criar política correta para SELECT
DROP POLICY IF EXISTS "Users can read their own professor profile" ON professores;

CREATE POLICY "Users can read their own professor profile"
ON professores
FOR SELECT
USING (auth.uid() = user_id);

-- 5. Criar política para INSERT (se necessário)
DROP POLICY IF EXISTS "Users can insert their own professor profile" ON professores;

CREATE POLICY "Users can insert their own professor profile"
ON professores
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 6. Criar política para UPDATE (se necessário)
DROP POLICY IF EXISTS "Users can update their own professor profile" ON professores;

CREATE POLICY "Users can update their own professor profile"
ON professores
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 7. Reativar RLS (se foi desativado)
-- ALTER TABLE professores ENABLE ROW LEVEL SECURITY;

-- 8. Verificar estrutura da tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'professores'
ORDER BY ordinal_position;
