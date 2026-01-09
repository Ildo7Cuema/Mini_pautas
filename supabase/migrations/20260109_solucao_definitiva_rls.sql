-- ============================================================================
-- SOLUÇÃO DEFINITIVA: Correção de Recursão Infinita em RLS (user_profiles)
-- ============================================================================
-- Autor: Engenheiro Backend Sênior
-- Data: 2026-01-09
-- Erro: 42P17 - infinite recursion detected in policy for relation "user_profiles"
-- ============================================================================

-- ============================================================================
-- DIAGNÓSTICO TÉCNICO
-- ============================================================================
-- 
-- CAUSA RAIZ:
-- As políticas RLS existentes na tabela `user_profiles` utilizam funções helper
-- como `is_superadmin()`, `is_direcao_municipal()`, etc. Estas funções executam:
--
--   SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND tipo_perfil = 'X'
--
-- Quando o PostgreSQL avalia uma política RLS em `user_profiles`, e essa política
-- chama uma função que faz SELECT em `user_profiles`, o sistema tenta avaliar
-- as políticas RLS novamente → loop infinito → erro 42P17.
--
-- SOLUÇÃO:
-- 1. Eliminar TODAS as políticas existentes em `user_profiles`
-- 2. Criar políticas SIMPLES que usam APENAS `auth.uid()` (nunca subqueries)
-- 3. Para verificações de role complexas, usar tabela de cache SEM RLS
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASSO 1: Criar/Atualizar tabela role_cache (SEM RLS)
-- ============================================================================
-- Esta tabela armazena os flags de permissão pré-calculados.
-- Como não tem RLS, pode ser consultada sem causar recursão.

CREATE TABLE IF NOT EXISTS role_cache (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tipo_perfil TEXT,
    escola_id UUID,
    municipio TEXT,
    provincia TEXT,
    ativo BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar colunas em falta (para instalações existentes)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'role_cache' AND column_name = 'tipo_perfil') THEN
        ALTER TABLE role_cache ADD COLUMN tipo_perfil TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'role_cache' AND column_name = 'ativo') THEN
        ALTER TABLE role_cache ADD COLUMN ativo BOOLEAN DEFAULT true;
    END IF;
END $$;

-- CRÍTICO: Desativar RLS na tabela de cache
ALTER TABLE role_cache DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON role_cache TO authenticated;
GRANT SELECT ON role_cache TO anon;

-- ============================================================================
-- PASSO 2: Popular role_cache com dados existentes
-- ============================================================================

INSERT INTO role_cache (user_id, tipo_perfil, escola_id, municipio, provincia, ativo, updated_at)
SELECT 
    up.user_id,
    up.tipo_perfil,
    up.escola_id,
    dm.municipio,
    dp.provincia,
    up.ativo,
    NOW()
FROM user_profiles up
LEFT JOIN direcoes_municipais dm ON up.user_id = dm.user_id
LEFT JOIN direcoes_provinciais dp ON up.user_id = dp.user_id
ON CONFLICT (user_id) DO UPDATE SET
    tipo_perfil = EXCLUDED.tipo_perfil,
    escola_id = EXCLUDED.escola_id,
    municipio = EXCLUDED.municipio,
    provincia = EXCLUDED.provincia,
    ativo = EXCLUDED.ativo,
    updated_at = NOW();

-- ============================================================================
-- PASSO 3: Reescrever funções helper para usar role_cache
-- ============================================================================

CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (SELECT tipo_perfil = 'SUPERADMIN' AND ativo FROM role_cache WHERE user_id = auth.uid()),
        false
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_direcao_municipal()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (SELECT tipo_perfil = 'DIRECAO_MUNICIPAL' AND ativo FROM role_cache WHERE user_id = auth.uid()),
        false
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_direcao_provincial()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (SELECT tipo_perfil = 'DIRECAO_PROVINCIAL' AND ativo FROM role_cache WHERE user_id = auth.uid()),
        false
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_user_escola_id()
RETURNS UUID AS $$
    SELECT escola_id FROM role_cache WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_direcao_municipio()
RETURNS TEXT AS $$
    SELECT municipio FROM role_cache WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_direcao_provincia()
RETURNS TEXT AS $$
    SELECT provincia FROM role_cache WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================
-- PASSO 4: Eliminar TODAS as políticas existentes em user_profiles
-- ============================================================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'user_profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_profiles', pol.policyname);
        RAISE NOTICE 'Política eliminada: %', pol.policyname;
    END LOOP;
END $$;

-- ============================================================================
-- PASSO 5: Criar políticas RLS minimalistas e seguras
-- ============================================================================
-- REGRA DE OURO: Usar APENAS auth.uid() ou consultas à role_cache (sem RLS)

-- Garantir que RLS está ativo
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: Utilizador pode ler o seu próprio perfil
CREATE POLICY "select_own_profile"
    ON user_profiles FOR SELECT
    USING (user_id = auth.uid());

-- SELECT: SUPERADMIN pode ler todos os perfis
CREATE POLICY "select_superadmin"
    ON user_profiles FOR SELECT
    USING (
        (SELECT tipo_perfil FROM role_cache WHERE user_id = auth.uid()) = 'SUPERADMIN'
    );

-- SELECT: Utilizadores da mesma escola podem ver perfis da escola
CREATE POLICY "select_same_escola"
    ON user_profiles FOR SELECT
    USING (
        escola_id IS NOT NULL 
        AND escola_id = (SELECT escola_id FROM role_cache WHERE user_id = auth.uid())
    );

-- SELECT: Direção Municipal pode ver perfis do seu município
CREATE POLICY "select_direcao_municipal"
    ON user_profiles FOR SELECT
    USING (
        (SELECT tipo_perfil FROM role_cache WHERE user_id = auth.uid()) = 'DIRECAO_MUNICIPAL'
        AND escola_id IN (
            SELECT id FROM escolas 
            WHERE municipio = (SELECT municipio FROM role_cache WHERE user_id = auth.uid())
        )
    );

-- SELECT: Direção Provincial pode ver perfis da sua província
CREATE POLICY "select_direcao_provincial"
    ON user_profiles FOR SELECT
    USING (
        (SELECT tipo_perfil FROM role_cache WHERE user_id = auth.uid()) = 'DIRECAO_PROVINCIAL'
        AND escola_id IN (
            SELECT id FROM escolas 
            WHERE provincia = (SELECT provincia FROM role_cache WHERE user_id = auth.uid())
        )
    );

-- UPDATE: Utilizador pode atualizar apenas o seu próprio perfil
CREATE POLICY "update_own_profile"
    ON user_profiles FOR UPDATE
    USING (user_id = auth.uid());

-- UPDATE: SUPERADMIN pode atualizar qualquer perfil
CREATE POLICY "update_superadmin"
    ON user_profiles FOR UPDATE
    USING (
        (SELECT tipo_perfil FROM role_cache WHERE user_id = auth.uid()) = 'SUPERADMIN'
    );

-- INSERT: Permitir criação de perfil após signup (via triggers/functions SECURITY DEFINER)
CREATE POLICY "insert_own_profile"
    ON user_profiles FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- INSERT: SUPERADMIN pode criar qualquer perfil
CREATE POLICY "insert_superadmin"
    ON user_profiles FOR INSERT
    WITH CHECK (
        (SELECT tipo_perfil FROM role_cache WHERE user_id = auth.uid()) = 'SUPERADMIN'
    );

-- DELETE: Apenas SUPERADMIN pode eliminar perfis
CREATE POLICY "delete_superadmin"
    ON user_profiles FOR DELETE
    USING (
        (SELECT tipo_perfil FROM role_cache WHERE user_id = auth.uid()) = 'SUPERADMIN'
    );

-- ============================================================================
-- PASSO 6: Trigger para sincronizar role_cache
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_role_cache()
RETURNS TRIGGER AS $$
DECLARE
    v_municipio TEXT;
    v_provincia TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM role_cache WHERE user_id = OLD.user_id;
        RETURN OLD;
    END IF;

    SELECT municipio INTO v_municipio FROM direcoes_municipais WHERE user_id = NEW.user_id;
    SELECT provincia INTO v_provincia FROM direcoes_provinciais WHERE user_id = NEW.user_id;

    INSERT INTO role_cache (user_id, tipo_perfil, escola_id, municipio, provincia, ativo, updated_at)
    VALUES (NEW.user_id, NEW.tipo_perfil, NEW.escola_id, v_municipio, v_provincia, NEW.ativo, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        tipo_perfil = EXCLUDED.tipo_perfil,
        escola_id = EXCLUDED.escola_id,
        municipio = EXCLUDED.municipio,
        provincia = EXCLUDED.provincia,
        ativo = EXCLUDED.ativo,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_role_cache ON user_profiles;
CREATE TRIGGER trigger_sync_role_cache
    AFTER INSERT OR UPDATE OR DELETE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_role_cache();

COMMIT;

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================
--
-- EXPLICAÇÃO FINAL:
--
-- 1. PORQUE OCORRIA O ERRO 42P17:
--    As funções is_superadmin(), is_direcao_municipal() etc. faziam SELECT em
--    user_profiles. Quando chamadas dentro de políticas RLS de user_profiles,
--    criavam um loop infinito de avaliação de políticas.
--
-- 2. PORQUE O PERFIL ERRADO ERA RETORNADO:
--    A recursão fazia com que o Supabase abortasse a query. O AuthContext
--    recebia um erro ou resultado vazio, e o frontend assumia role "user".
--
-- 3. COMO A NOVA ABORDAGEM RESOLVE:
--    a) Tabela role_cache SEM RLS armazena permissões pré-calculadas
--    b) Todas as funções helper agora consultam role_cache (não user_profiles)
--    c) Políticas RLS usam apenas auth.uid() ou consultas a role_cache
--    d) Trigger mantém role_cache sincronizado automaticamente
--
-- COMPATIBILIDADE: React, Vue, Flutter, qualquer cliente Supabase
-- ============================================================================
