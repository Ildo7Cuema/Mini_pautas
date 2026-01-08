-- ============================================
-- FIX FINAL: Remover TODAS as policies de user_profiles que causam recursão
-- 
-- ANÁLISE COMPLETA DO PROBLEMA:
-- As seguintes funções consultam user_profiles:
--   - is_aluno() 
--   - is_encarregado()
--   - is_superadmin()
--   - is_direcao_municipal()
--   - get_current_user_escola_id()
--
-- E são usadas em policies de user_profiles, causando recursão infinita.
--
-- SOLUÇÃO: Remover TODAS estas policies de user_profiles.
-- A policy base "Users can view own profile" (user_id = auth.uid()) é suficiente
-- para a maioria dos casos. Para roles especiais, usamos role_cache.
-- ============================================

-- ============================================
-- PASSO 1: Remover TODAS as policies problemáticas de user_profiles
-- ============================================

-- Políticas que usam is_aluno() e is_encarregado()
DROP POLICY IF EXISTS "ALUNO can view own user_profile" ON user_profiles;
DROP POLICY IF EXISTS "ENCARREGADO can view own user_profile" ON user_profiles;

-- Políticas que usam is_superadmin() ou is_superadmin_cached() ou is_superadmin_safe()
DROP POLICY IF EXISTS "SUPERADMIN can view all user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "SUPERADMIN can insert user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "SUPERADMIN can update all user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "SUPERADMIN can view all user_profiles safe" ON user_profiles;
DROP POLICY IF EXISTS "SUPERADMIN can insert user_profiles safe" ON user_profiles;
DROP POLICY IF EXISTS "SUPERADMIN can update all user_profiles safe" ON user_profiles;

-- Políticas que usam is_direcao_municipal() ou variantes
DROP POLICY IF EXISTS "Direcao Municipal can view user_profiles in municipio" ON user_profiles;
DROP POLICY IF EXISTS "Direcao Municipal can view user_profiles in municipio v2" ON user_profiles;
DROP POLICY IF EXISTS "Direcao Municipal can view user_profiles in municipio safe" ON user_profiles;

-- Políticas que usam get_current_user_escola_id()
DROP POLICY IF EXISTS "Schools can view their teachers profiles" ON user_profiles;

-- ============================================
-- PASSO 2: Garantir que a tabela role_cache existe e está sem RLS
-- ============================================

CREATE TABLE IF NOT EXISTS role_cache (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_superadmin BOOLEAN DEFAULT false,
    is_direcao_municipal BOOLEAN DEFAULT false,
    municipio TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar colunas que podem não existir (se tabela já foi criada antes)
DO $$ 
BEGIN
    ALTER TABLE role_cache ADD COLUMN IF NOT EXISTS is_escola BOOLEAN DEFAULT false;
    ALTER TABLE role_cache ADD COLUMN IF NOT EXISTS escola_id UUID;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE role_cache DISABLE ROW LEVEL SECURITY;

-- Criar índices (agora as colunas existem)
CREATE INDEX IF NOT EXISTS idx_role_cache_superadmin ON role_cache(is_superadmin) WHERE is_superadmin = true;
CREATE INDEX IF NOT EXISTS idx_role_cache_direcao ON role_cache(is_direcao_municipal) WHERE is_direcao_municipal = true;
CREATE INDEX IF NOT EXISTS idx_role_cache_escola ON role_cache(is_escola) WHERE is_escola = true;

INSERT INTO role_cache (user_id, is_superadmin, is_direcao_municipal, is_escola, escola_id, municipio, updated_at)
SELECT 
    up.user_id,
    up.tipo_perfil = 'SUPERADMIN' AND up.ativo,
    up.tipo_perfil = 'DIRECAO_MUNICIPAL' AND up.ativo,
    up.tipo_perfil = 'ESCOLA' AND up.ativo,
    up.escola_id,
    dm.municipio,
    NOW()
FROM user_profiles up
LEFT JOIN direcoes_municipais dm ON up.user_id = dm.user_id
ON CONFLICT (user_id) DO UPDATE SET
    is_superadmin = EXCLUDED.is_superadmin,
    is_direcao_municipal = EXCLUDED.is_direcao_municipal,
    is_escola = EXCLUDED.is_escola,
    escola_id = EXCLUDED.escola_id,
    municipio = EXCLUDED.municipio,
    updated_at = NOW();

-- ============================================
-- PASSO 4: Atualizar trigger para sincronizar role_cache
-- ============================================

CREATE OR REPLACE FUNCTION sync_role_cache_from_profile()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM role_cache WHERE user_id = OLD.user_id;
        RETURN OLD;
    END IF;

    INSERT INTO role_cache (user_id, is_superadmin, is_direcao_municipal, is_escola, escola_id, updated_at)
    VALUES (
        NEW.user_id,
        NEW.tipo_perfil = 'SUPERADMIN' AND NEW.ativo,
        NEW.tipo_perfil = 'DIRECAO_MUNICIPAL' AND NEW.ativo,
        NEW.tipo_perfil = 'ESCOLA' AND NEW.ativo,
        NEW.escola_id,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        is_superadmin = NEW.tipo_perfil = 'SUPERADMIN' AND NEW.ativo,
        is_direcao_municipal = NEW.tipo_perfil = 'DIRECAO_MUNICIPAL' AND NEW.ativo,
        is_escola = NEW.tipo_perfil = 'ESCOLA' AND NEW.ativo,
        escola_id = NEW.escola_id,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_role_cache ON user_profiles;
CREATE TRIGGER trigger_sync_role_cache
    AFTER INSERT OR UPDATE OR DELETE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_role_cache_from_profile();

-- ============================================
-- PASSO 5: Criar funções helper que usam role_cache
-- ============================================

CREATE OR REPLACE FUNCTION is_superadmin_cached()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE((SELECT is_superadmin FROM role_cache WHERE user_id = auth.uid()), false);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION is_direcao_municipal_cached()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE((SELECT is_direcao_municipal FROM role_cache WHERE user_id = auth.uid()), false);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_direcao_municipio_cached()
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT municipio FROM role_cache WHERE user_id = auth.uid() AND is_direcao_municipal = true);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_escola_id_cached()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT escola_id FROM role_cache WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- PASSO 6: Recriar policies de user_profiles usando APENAS role_cache
-- ============================================

-- SUPERADMIN pode ver todos
CREATE POLICY "SUPERADMIN can view all user_profiles"
    ON user_profiles FOR SELECT
    USING (is_superadmin_cached());

CREATE POLICY "SUPERADMIN can insert user_profiles"
    ON user_profiles FOR INSERT
    WITH CHECK (is_superadmin_cached());

CREATE POLICY "SUPERADMIN can update all user_profiles"
    ON user_profiles FOR UPDATE
    USING (is_superadmin_cached());

-- Direção Municipal pode ver perfis do seu município
CREATE POLICY "Direcao Municipal can view user_profiles in municipio"
    ON user_profiles FOR SELECT
    USING (
        is_direcao_municipal_cached() AND (
            user_id = auth.uid()
            OR
            escola_id IN (
                SELECT e.id FROM escolas e 
                WHERE e.municipio = get_direcao_municipio_cached()
            )
        )
    );

-- Escolas podem ver perfis de professores associados
CREATE POLICY "Schools can view their teachers profiles"
    ON user_profiles FOR SELECT
    USING (escola_id = get_escola_id_cached());

-- ============================================
-- PASSO 7: Garantir permissões
-- ============================================

GRANT SELECT ON role_cache TO authenticated;

-- ============================================
-- VERIFICAÇÃO: Lista policies actuais de user_profiles
-- Execute após a migração para confirmar que não há policies problemáticas:
-- SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles';
-- ============================================
