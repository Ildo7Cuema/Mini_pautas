-- PARTE 1: Limpar políticas existentes
-- Execute esta parte primeiro

DROP POLICY IF EXISTS "Escolas podem criar próprio registro" ON escolas;
DROP POLICY IF EXISTS "Escolas podem criar proprio registro" ON escolas;
DROP POLICY IF EXISTS "Schools can view their teachers profiles" ON user_profiles;
DROP POLICY IF EXISTS "Schools can create teacher profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can create own escola profile" ON user_profiles;

-- Drop turmas policies that need to be recreated
DROP POLICY IF EXISTS "Escola pode ver suas turmas" ON turmas;
DROP POLICY IF EXISTS "Escola pode criar turmas" ON turmas;
DROP POLICY IF EXISTS "Escola pode atualizar suas turmas" ON turmas;
DROP POLICY IF EXISTS "Escola pode deletar suas turmas" ON turmas;
DROP POLICY IF EXISTS "Professor pode ver turmas associadas" ON turmas;
