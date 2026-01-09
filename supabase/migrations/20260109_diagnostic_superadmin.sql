-- ============================================================================
-- DIAGNÓSTICO: Testar is_superadmin() para o utilizador actual
-- Execute isto no Supabase SQL Editor enquanto está logado como SUPERADMIN
-- ============================================================================

-- 1. Verificar o utilizador actual
SELECT auth.uid() as current_user_id;

-- 2. Verificar se o utilizador está em role_cache
SELECT * FROM role_cache WHERE user_id = auth.uid();

-- 3. Verificar o resultado de is_superadmin()
SELECT is_superadmin() as is_superadmin_result;

-- 4. Verificar user_profiles do utilizador actual
SELECT * FROM user_profiles WHERE user_id = auth.uid();

-- 5. Ver todos os SUPERADMIN em user_profiles
SELECT user_id, tipo_perfil, ativo FROM user_profiles WHERE tipo_perfil = 'SUPERADMIN';

-- 6. Ver todos os SUPERADMIN em role_cache  
SELECT user_id, tipo_perfil, ativo FROM role_cache WHERE tipo_perfil = 'SUPERADMIN';

-- ============================================================================
-- SE is_superadmin() retornar FALSE, execute isto para corrigir:
-- ============================================================================

-- 7. Forçar refresh do role_cache para o utilizador actual
INSERT INTO role_cache (user_id, tipo_perfil, escola_id, municipio, provincia, ativo, updated_at)
SELECT 
    up.user_id,
    up.tipo_perfil,
    up.escola_id,
    NULL,
    NULL,
    up.ativo,
    NOW()
FROM user_profiles up
WHERE up.user_id = auth.uid()
ON CONFLICT (user_id) DO UPDATE SET
    tipo_perfil = EXCLUDED.tipo_perfil,
    ativo = EXCLUDED.ativo,
    updated_at = NOW();

-- 8. Verificar de novo
SELECT is_superadmin() as is_superadmin_after_fix;
