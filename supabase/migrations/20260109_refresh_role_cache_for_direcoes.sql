-- ============================================================================
-- MIGRATION: Refresh role_cache for SUPERADMIN access
-- Purpose: Ensure role_cache is properly populated to allow SUPERADMIN to 
--          access direcoes_municipais and direcoes_provinciais tables
-- Date: 2026-01-09
-- ============================================================================

-- Step 1: Ensure role_cache table exists
CREATE TABLE IF NOT EXISTS role_cache (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tipo_perfil TEXT,
    escola_id UUID,
    municipio TEXT,
    provincia TEXT,
    ativo BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Ensure RLS is disabled on role_cache (critical for function access)
ALTER TABLE role_cache DISABLE ROW LEVEL SECURITY;

-- Step 3: Grant access
GRANT SELECT ON role_cache TO authenticated;
GRANT SELECT ON role_cache TO anon;

-- Step 4: Refresh role_cache data from user_profiles
-- This ensures all users including SUPERADMIN are in the cache
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
LEFT JOIN direcoes_provinciais dp ON dp.user_id = up.user_id
LEFT JOIN escolas e ON up.escola_id = e.id
ON CONFLICT (user_id) DO UPDATE SET
    tipo_perfil = EXCLUDED.tipo_perfil,
    escola_id = EXCLUDED.escola_id,
    municipio = EXCLUDED.municipio,
    provincia = EXCLUDED.provincia,
    ativo = EXCLUDED.ativo,
    updated_at = NOW();

-- Step 5: Diagnostic query - show SUPERADMIN users in role_cache
SELECT 
    'SUPERADMIN users in role_cache: ' || COUNT(*) as status
FROM role_cache 
WHERE tipo_perfil = 'SUPERADMIN';

-- Step 6: Add bloqueado columns to direcoes_provinciais if they don't exist
ALTER TABLE direcoes_provinciais 
    ADD COLUMN IF NOT EXISTS bloqueado BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS bloqueado_motivo TEXT,
    ADD COLUMN IF NOT EXISTS bloqueado_em TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS bloqueado_por UUID REFERENCES auth.users(id);

-- Step 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_direcoes_provinciais_bloqueado ON direcoes_provinciais(bloqueado);
CREATE INDEX IF NOT EXISTS idx_direcoes_provinciais_ativo ON direcoes_provinciais(ativo);

-- Step 8: Ensure is_superadmin() function reads from role_cache correctly
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (SELECT tipo_perfil = 'SUPERADMIN' AND ativo FROM role_cache WHERE user_id = auth.uid()),
        false
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Step 9: Verify the setup
SELECT 
    'Total users in role_cache: ' || COUNT(*) as info
FROM role_cache
UNION ALL
SELECT 
    'SUPERADMIN count: ' || COUNT(*) 
FROM role_cache WHERE tipo_perfil = 'SUPERADMIN'
UNION ALL
SELECT 
    'Direcoes Municipais count: ' || COUNT(*) 
FROM direcoes_municipais
UNION ALL
SELECT 
    'Direcoes Provinciais count: ' || COUNT(*) 
FROM direcoes_provinciais;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
