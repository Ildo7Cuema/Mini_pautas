-- Adicionar políticas RLS para permitir criação de perfil de professor

-- 1. Permitir que utilizadores autenticados criem escolas
DROP POLICY IF EXISTS "Authenticated users can create schools" ON escolas;
CREATE POLICY "Authenticated users can create schools"
ON escolas
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2. Permitir que utilizadores autenticados vejam escolas (para verificar se já existe)
DROP POLICY IF EXISTS "Authenticated users can view schools" ON escolas;
CREATE POLICY "Authenticated users can view schools"
ON escolas
FOR SELECT
TO authenticated
USING (true);

-- 3. Permitir que utilizadores criem o seu próprio perfil de professor
DROP POLICY IF EXISTS "Users can create own professor profile" ON professores;
CREATE POLICY "Users can create own professor profile"
ON professores
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Verificar políticas existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('escolas', 'professores')
ORDER BY tablename, policyname;
