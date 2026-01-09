-- ============================================
-- MIGRATION: Sincronizar role_cache e Corrigir Políticas RLS
-- Purpose: Garantir que SUPERADMIN consegue ver dados de direcoes_municipais e direcoes_provinciais
-- Date: 2026-01-09
-- ============================================

-- ==============================================================================
-- STEP 1: Garantir que role_cache está sincronizado para todos os usuários
-- ==============================================================================

-- Primeiro, vamos atualizar o role_cache baseado em todos os perfis existentes
INSERT INTO role_cache (user_id, is_superadmin, is_direcao_municipal, is_direcao_provincial, is_escola, escola_id, municipio, provincia, updated_at)
SELECT 
    up.user_id,
    up.tipo_perfil = 'SUPERADMIN' AND up.ativo,
    up.tipo_perfil = 'DIRECAO_MUNICIPAL' AND up.ativo,
    up.tipo_perfil = 'DIRECAO_PROVINCIAL' AND up.ativo,
    up.tipo_perfil = 'ESCOLA' AND up.ativo,
    up.escola_id,
    dm.municipio,
    COALESCE(dp.provincia, dm.provincia),
    NOW()
FROM user_profiles up
LEFT JOIN direcoes_municipais dm ON up.user_id = dm.user_id
LEFT JOIN direcoes_provinciais dp ON up.user_id = dp.user_id
ON CONFLICT (user_id) DO UPDATE SET
    is_superadmin = EXCLUDED.is_superadmin,
    is_direcao_municipal = EXCLUDED.is_direcao_municipal,
    is_direcao_provincial = EXCLUDED.is_direcao_provincial,
    is_escola = EXCLUDED.is_escola,
    escola_id = EXCLUDED.escola_id,
    municipio = EXCLUDED.municipio,
    provincia = EXCLUDED.provincia,
    updated_at = NOW();

-- ==============================================================================
-- STEP 2: Recriar funções de verificação de roles como SECURITY DEFINER
-- ==============================================================================

-- Função is_superadmin com SECURITY DEFINER para evitar problemas de RLS
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(
        (SELECT is_superadmin FROM role_cache WHERE user_id = auth.uid()), 
        false
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Função is_direcao_municipal também com SECURITY DEFINER
CREATE OR REPLACE FUNCTION is_direcao_municipal()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(
        (SELECT is_direcao_municipal FROM role_cache WHERE user_id = auth.uid()), 
        false
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Função is_direcao_provincial também com SECURITY DEFINER
CREATE OR REPLACE FUNCTION is_direcao_provincial()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(
        (SELECT is_direcao_provincial FROM role_cache WHERE user_id = auth.uid()), 
        false
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ==============================================================================
-- STEP 3: Garantir que as políticas RLS para direcoes_municipais cobrem SUPERADMIN
-- ==============================================================================

-- Remover política existente e recriar
DROP POLICY IF EXISTS "SUPERADMIN can manage all direcoes_municipais" ON direcoes_municipais;

CREATE POLICY "SUPERADMIN can manage all direcoes_municipais"
    ON direcoes_municipais FOR ALL
    USING (is_superadmin());

-- Adicionar política alternativa baseada diretamente na verificação do profile
-- Isso garante acesso mesmo se role_cache não estiver sincronizado
DROP POLICY IF EXISTS "SUPERADMIN direct access direcoes_municipais" ON direcoes_municipais;

CREATE POLICY "SUPERADMIN direct access direcoes_municipais"
    ON direcoes_municipais FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND tipo_perfil = 'SUPERADMIN' 
            AND ativo = true
        )
    );

-- ==============================================================================
-- STEP 4: Garantir que as políticas RLS para direcoes_provinciais cobrem SUPERADMIN
-- ==============================================================================

-- Remover política existente e recriar
DROP POLICY IF EXISTS "SUPERADMIN can manage all direcoes_provinciais" ON direcoes_provinciais;

CREATE POLICY "SUPERADMIN can manage all direcoes_provinciais"
    ON direcoes_provinciais FOR ALL
    USING (is_superadmin());

-- Adicionar política alternativa baseada diretamente na verificação do profile
DROP POLICY IF EXISTS "SUPERADMIN direct access direcoes_provinciais" ON direcoes_provinciais;

CREATE POLICY "SUPERADMIN direct access direcoes_provinciais"
    ON direcoes_provinciais FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND tipo_perfil = 'SUPERADMIN' 
            AND ativo = true
        )
    );

-- ==============================================================================
-- STEP 5: Garantir permissões de leitura para authenticated users nas tabelas
-- ==============================================================================

-- Garantir que authenticated users podem SELECT nas tabelas
GRANT SELECT ON direcoes_municipais TO authenticated;
GRANT SELECT ON direcoes_provinciais TO authenticated;
GRANT SELECT ON role_cache TO authenticated;

-- ==============================================================================
-- STEP 6: Verificação (para debug)
-- ==============================================================================

-- Este comando pode ser usado para verificar se o cache está correto:
-- SELECT user_id, is_superadmin FROM role_cache WHERE is_superadmin = true;

-- ============================================
-- END OF MIGRATION
-- ============================================
