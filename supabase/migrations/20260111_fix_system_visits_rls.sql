-- ============================================
-- FIXED: Monitorização de Visitas RLS
-- Date: 2026-01-11
-- Purpose: Refresh role_cache to ensure SuperAdmin permissions are recognized
--          and verify RLS policies for system_visits table.
-- ============================================

-- 1. Forçar a atualização do cache de permissões (role_cache)
-- Isso garante que a função is_superadmin() retorne TRUE para quem é de facto SuperAdmin
INSERT INTO role_cache (user_id, is_superadmin, is_direcao_municipal, is_direcao_provincial, is_escola, escola_id, municipio, provincia, updated_at)
SELECT 
    up.user_id,
    up.tipo_perfil = 'SUPERADMIN' AND up.ativo,
    up.tipo_perfil = 'DIRECAO_MUNICIPAL' AND up.ativo,
    up.tipo_perfil = 'DIRECAO_PROVINCIAL' AND up.ativo,
    up.tipo_perfil = 'ESCOLA' AND up.ativo,
    up.escola_id,
    dm.municipio,
    dp.provincia,
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

-- 2. Garantir que a tabela system_visits tem RLS activado
ALTER TABLE system_visits ENABLE ROW LEVEL SECURITY;

-- 3. Recriar a política de leitura para SUPERADMIN para garantir que usa a função correcta
DROP POLICY IF EXISTS "SUPERADMIN can view all visits" ON system_visits;

CREATE POLICY "SUPERADMIN can view all visits"
    ON system_visits FOR SELECT
    USING (is_superadmin());

-- 4. Garantir que a view de estatísticas está acessível
GRANT SELECT ON system_visit_stats TO authenticated;

-- 5. Confirmação
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM role_cache WHERE is_superadmin = true;
    RAISE NOTICE 'Cache atualizado. Total de SuperAdmins encontrados: %', v_count;
END $$;
