-- ============================================================================
-- DIAGNÓSTICO E CORREÇÃO FINAL - Erro 42P17
-- ============================================================================
-- Execute este script para:
-- 1. Verificar estado actual das funções
-- 2. Garantir que role_cache está populado
-- 3. Forçar recriação das funções sem cache do PostgreSQL
-- ============================================================================

-- ============================================================================
-- PASSO 1: Verificar e garantir que role_cache existe e tem dados
-- ============================================================================

-- Criar tabela se não existir
CREATE TABLE IF NOT EXISTS role_cache (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tipo_perfil TEXT,
    escola_id UUID,
    municipio TEXT,
    provincia TEXT,
    ativo BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CRÍTICO: Desativar RLS
ALTER TABLE role_cache DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON role_cache TO authenticated;
GRANT SELECT ON role_cache TO anon;

-- Popular com dados actuais (forçar refresh)
TRUNCATE role_cache;

INSERT INTO role_cache (user_id, tipo_perfil, escola_id, municipio, provincia, ativo, updated_at)
SELECT 
    up.user_id,
    up.tipo_perfil,
    up.escola_id,
    COALESCE(dm.municipio, e.municipio),
    COALESCE(dp.provincia, e.provincia),
    up.ativo,
    NOW()
FROM user_profiles up
LEFT JOIN direcoes_municipais dm ON up.user_id = dm.user_id
LEFT JOIN direcoes_provinciais dp ON up.user_id = dp.user_id
LEFT JOIN escolas e ON up.escola_id = e.id;

-- ============================================================================
-- PASSO 2: FORÇAR recriação das funções (DROP + CREATE)
-- ============================================================================

-- Remover funções existentes completamente
DROP FUNCTION IF EXISTS is_superadmin() CASCADE;
DROP FUNCTION IF EXISTS is_direcao_municipal() CASCADE;
DROP FUNCTION IF EXISTS is_direcao_provincial() CASCADE;
DROP FUNCTION IF EXISTS get_current_user_escola_id() CASCADE;
DROP FUNCTION IF EXISTS get_direcao_municipio() CASCADE;
DROP FUNCTION IF EXISTS get_direcao_provincia() CASCADE;

-- Recriar funções que consultam APENAS role_cache
CREATE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (SELECT tipo_perfil = 'SUPERADMIN' AND ativo FROM role_cache WHERE user_id = auth.uid()),
        false
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE FUNCTION is_direcao_municipal()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (SELECT tipo_perfil = 'DIRECAO_MUNICIPAL' AND ativo FROM role_cache WHERE user_id = auth.uid()),
        false
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE FUNCTION is_direcao_provincial()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (SELECT tipo_perfil = 'DIRECAO_PROVINCIAL' AND ativo FROM role_cache WHERE user_id = auth.uid()),
        false
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE FUNCTION get_current_user_escola_id()
RETURNS UUID AS $$
    SELECT escola_id FROM role_cache WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE FUNCTION get_direcao_municipio()
RETURNS TEXT AS $$
    SELECT municipio FROM role_cache WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE FUNCTION get_direcao_provincia()
RETURNS TEXT AS $$
    SELECT provincia FROM role_cache WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================
-- PASSO 3: Eliminar TODAS as políticas de user_profiles
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
    END LOOP;
END $$;

-- ============================================================================
-- PASSO 4: Criar políticas ULTRA-SIMPLES (sem subqueries complexas)
-- ============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Política 1: Ler próprio perfil (SEMPRE funciona)
CREATE POLICY "own_profile_select"
    ON user_profiles FOR SELECT
    USING (user_id = auth.uid());

-- Política 2: SUPERADMIN lê todos
CREATE POLICY "superadmin_select"
    ON user_profiles FOR SELECT
    USING (is_superadmin());

-- Política 3: SUPERADMIN escreve todos
CREATE POLICY "superadmin_all"
    ON user_profiles FOR ALL
    USING (is_superadmin());

-- Política 4: Mesma escola
CREATE POLICY "same_escola_select"
    ON user_profiles FOR SELECT
    USING (
        escola_id IS NOT NULL 
        AND escola_id = get_current_user_escola_id()
    );

-- Política 5: Update próprio
CREATE POLICY "own_profile_update"
    ON user_profiles FOR UPDATE
    USING (user_id = auth.uid());

-- Política 6: Insert próprio
CREATE POLICY "own_profile_insert"
    ON user_profiles FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- PASSO 5: Trigger de sincronização
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_role_cache_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM role_cache WHERE user_id = OLD.user_id;
        RETURN OLD;
    END IF;

    INSERT INTO role_cache (user_id, tipo_perfil, escola_id, municipio, provincia, ativo, updated_at)
    SELECT 
        NEW.user_id,
        NEW.tipo_perfil,
        NEW.escola_id,
        COALESCE(dm.municipio, e.municipio),
        COALESCE(dp.provincia, e.provincia),
        NEW.ativo,
        NOW()
    FROM (SELECT 1) dummy
    LEFT JOIN direcoes_municipais dm ON dm.user_id = NEW.user_id
    LEFT JOIN direcoes_provinciais dp ON dp.user_id = NEW.user_id
    LEFT JOIN escolas e ON e.id = NEW.escola_id
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
    EXECUTE FUNCTION sync_role_cache_trigger();

-- ============================================================================
-- VERIFICAÇÃO: Mostrar dados em role_cache
-- ============================================================================

SELECT 'role_cache populado com ' || COUNT(*) || ' registos' AS status FROM role_cache;

-- ============================================================================
-- FIM
-- ============================================================================
