-- ============================================
-- FIX DEFINITIVO: Remover TODAS as policies que causam recursão em user_profiles
-- 
-- PROBLEMA: As funções is_superadmin() e is_direcao_municipal() consultam
-- a tabela user_profiles. Usar estas funções em policies de user_profiles
-- causa recursão infinita.
--
-- SOLUÇÃO: Substituir por funções que NÃO consultam user_profiles
-- ============================================

-- ============================================
-- PASSO 1: Remover TODAS as policies problemáticas
-- ============================================

-- Policies do SUPERADMIN (usam is_superadmin() que consulta user_profiles)
DROP POLICY IF EXISTS "SUPERADMIN can view all user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "SUPERADMIN can insert user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "SUPERADMIN can update all user_profiles" ON user_profiles;

-- Policies da Direção Municipal
DROP POLICY IF EXISTS "Direcao Municipal can view user_profiles in municipio" ON user_profiles;
DROP POLICY IF EXISTS "Direcao Municipal can view user_profiles in municipio v2" ON user_profiles;

-- ============================================
-- PASSO 2: Criar funções helper que NÃO consultam user_profiles
-- ============================================

-- Verifica se é SUPERADMIN usando auth.jwt() diretamente
-- Isso funciona porque o metadata do user é armazenado no token JWT
CREATE OR REPLACE FUNCTION is_superadmin_safe()
RETURNS BOOLEAN AS $$
BEGIN
    -- Método alternativo: verificar no JWT metadata ou verificar diretamente via auth
    -- Como não temos acesso direto ao tipo_perfil no JWT, verificamos via query
    -- mas de uma forma que evita recursão
    
    -- Usamos uma subquery com SECURITY DEFINER que bypassa RLS
    RETURN (
        SELECT tipo_perfil = 'SUPERADMIN' AND ativo = true
        FROM user_profiles
        WHERE user_id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Verifica se é Direção Municipal diretamente via direcoes_municipais
CREATE OR REPLACE FUNCTION is_direcao_municipal_safe()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM direcoes_municipais dm
        WHERE dm.user_id = auth.uid() 
        AND dm.ativo = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Obtém o município da Direção Municipal diretamente
CREATE OR REPLACE FUNCTION get_direcao_municipio_safe()
RETURNS TEXT AS $$
DECLARE
    municipio_result TEXT;
BEGIN
    SELECT dm.municipio INTO municipio_result
    FROM direcoes_municipais dm
    WHERE dm.user_id = auth.uid() 
    AND dm.ativo = true
    LIMIT 1;
    
    RETURN municipio_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- PASSO 3: Recriar policies de user_profiles SEM causar recursão
-- Usamos verificação direta do user_id em vez de funções helper
-- ============================================

-- Policy base: Usuários podem ver seu próprio perfil
-- (Esta já deve existir, mas garantimos)
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
    ON user_profiles FOR SELECT
    USING (user_id = auth.uid());

-- SUPERADMIN pode ver todos (usando função SECURITY DEFINER que bypassa RLS)
CREATE POLICY "SUPERADMIN can view all user_profiles safe"
    ON user_profiles FOR SELECT
    USING (is_superadmin_safe());

CREATE POLICY "SUPERADMIN can insert user_profiles safe"
    ON user_profiles FOR INSERT
    WITH CHECK (is_superadmin_safe());

CREATE POLICY "SUPERADMIN can update all user_profiles safe"
    ON user_profiles FOR UPDATE
    USING (is_superadmin_safe());

-- Direção Municipal pode ver perfis do seu município
CREATE POLICY "Direcao Municipal can view user_profiles in municipio safe"
    ON user_profiles FOR SELECT
    USING (
        is_direcao_municipal_safe() AND (
            user_id = auth.uid()  -- Pode ver seu próprio perfil
            OR
            escola_id IN (
                SELECT e.id FROM escolas e 
                WHERE e.municipio = get_direcao_municipio_safe()
            )
        )
    );

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON FUNCTION is_superadmin_safe IS 'Verifica se usuário é SUPERADMIN - version que usa SECURITY DEFINER para evitar recursão RLS';
COMMENT ON FUNCTION is_direcao_municipal_safe IS 'Verifica se usuário é Direção Municipal via tabela direcoes_municipais (evita recursão)';
COMMENT ON FUNCTION get_direcao_municipio_safe IS 'Obtém município da Direção Municipal (evita recursão)';
