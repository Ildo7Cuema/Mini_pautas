-- Script para verificar e corrigir dados de professores
-- Execute este script no Supabase SQL Editor

-- ========================================
-- 1. VERIFICAR PROFESSORES SEM user_id
-- ========================================
SELECT 
    id,
    nome_completo,
    email,
    user_id,
    ativo,
    created_at
FROM professores
WHERE user_id IS NULL
ORDER BY created_at DESC;

-- ========================================
-- 2. VERIFICAR USUÁRIOS AUTH SEM PROFESSOR
-- ========================================
SELECT 
    au.id as auth_user_id,
    au.email,
    au.created_at,
    p.id as professor_id,
    p.nome_completo
FROM auth.users au
LEFT JOIN professores p ON p.user_id = au.id
WHERE p.id IS NULL
ORDER BY au.created_at DESC;

-- ========================================
-- 3. VINCULAR PROFESSORES POR EMAIL
-- ========================================
-- Este comando vincula automaticamente professores aos usuários auth pelo email
-- ATENÇÃO: Revise os resultados da query acima antes de executar!

-- Para ver o que será atualizado (DRY RUN):
SELECT 
    p.id as professor_id,
    p.nome_completo,
    p.email,
    p.user_id as current_user_id,
    au.id as new_user_id
FROM professores p
INNER JOIN auth.users au ON au.email = p.email
WHERE p.user_id IS NULL
  AND p.ativo = true;

-- Para executar a atualização (descomente para executar):
/*
UPDATE professores p
SET user_id = au.id
FROM auth.users au
WHERE au.email = p.email
  AND p.user_id IS NULL
  AND p.ativo = true;
*/

-- ========================================
-- 4. VERIFICAR PROFESSORES DUPLICADOS
-- ========================================
SELECT 
    email,
    COUNT(*) as total,
    STRING_AGG(id::text, ', ') as professor_ids
FROM professores
GROUP BY email
HAVING COUNT(*) > 1;

-- ========================================
-- 5. VERIFICAR PROFESSORES INATIVOS
-- ========================================
SELECT 
    id,
    nome_completo,
    email,
    user_id,
    ativo
FROM professores
WHERE ativo = false
ORDER BY created_at DESC;

-- ========================================
-- 6. ESTATÍSTICAS GERAIS
-- ========================================
SELECT 
    COUNT(*) as total_professores,
    COUNT(user_id) as professores_vinculados,
    COUNT(*) - COUNT(user_id) as professores_sem_vinculo,
    COUNT(CASE WHEN ativo = true THEN 1 END) as professores_ativos,
    COUNT(CASE WHEN ativo = false THEN 1 END) as professores_inativos
FROM professores;

-- ========================================
-- 7. VERIFICAR TRIGGER DE AUTO-LINK
-- ========================================
-- Verifica se o trigger existe
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'auto_link_professor_on_user_creation';

-- ========================================
-- 8. RECRIAR TRIGGER (se necessário)
-- ========================================
/*
-- Descomente para recriar o trigger

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS auto_link_professor_on_user_creation ON auth.users;
DROP FUNCTION IF EXISTS auto_link_professor_to_user();

-- Create function
CREATE OR REPLACE FUNCTION auto_link_professor_to_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Update professor record with the new user_id
    UPDATE professores
    SET user_id = NEW.id
    WHERE email = NEW.email
      AND user_id IS NULL
      AND ativo = true;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER auto_link_professor_on_user_creation
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION auto_link_professor_to_user();
*/
