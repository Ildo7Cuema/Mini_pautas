-- ============================================
-- DIAGNOSTIC SCRIPT: Verify RLS Setup
-- Purpose: Check if user_profiles and turmas data are correctly configured
-- ============================================

-- STEP 1: Check current user's authentication
SELECT 
    'Current User ID' as check_type,
    auth.uid() as value;

-- STEP 2: Check user_profiles for current user
SELECT 
    'User Profile' as check_type,
    user_id,
    tipo_perfil,
    escola_id,
    ativo
FROM user_profiles
WHERE user_id = auth.uid();

-- STEP 3: Test get_current_user_escola_id() function
SELECT 
    'get_current_user_escola_id() Result' as check_type,
    get_current_user_escola_id() as escola_id;

-- STEP 4: Check escolas table for this escola_id
SELECT 
    'Escola Record' as check_type,
    id,
    nome,
    user_id
FROM escolas
WHERE id = get_current_user_escola_id();

-- STEP 5: Check turmas for this escola_id
SELECT 
    'Turmas for this Escola' as check_type,
    id,
    nome,
    escola_id,
    created_at
FROM turmas
WHERE escola_id = get_current_user_escola_id()
LIMIT 5;

-- STEP 6: Check if there are ANY turmas in the database
SELECT 
    'Total Turmas in Database' as check_type,
    COUNT(*) as total,
    COUNT(DISTINCT escola_id) as distinct_escolas
FROM turmas;

-- STEP 7: Check RLS policies on turmas table
SELECT 
    'RLS Policies on Turmas' as check_type,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'turmas'
ORDER BY policyname;

-- STEP 8: Check if RLS is enabled on turmas
SELECT 
    'RLS Status' as check_type,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'turmas';
