-- ============================================
-- DIAGNÓSTICO: Verificar problemas com ALUNO/ENCARREGADO
-- Execute no Supabase SQL Editor
-- ============================================

-- 1. Verificar se existem alunos com user_id definido
SELECT 
    id, 
    nome_completo, 
    user_id, 
    encarregado_user_id,
    turma_id,
    ativo,
    created_at
FROM alunos 
WHERE user_id IS NOT NULL OR encarregado_user_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- 2. Verificar user_profiles existentes para ALUNO/ENCARREGADO
SELECT * 
FROM user_profiles 
WHERE tipo_perfil IN ('ALUNO', 'ENCARREGADO')
ORDER BY created_at DESC
LIMIT 10;

-- 3. Verificar todos os utilizadores auth com metadados ALUNO
SELECT 
    id,
    email,
    raw_user_meta_data->>'tipo_perfil' as meta_tipo,
    raw_user_meta_data->>'nome' as meta_nome,
    created_at
FROM auth.users
WHERE raw_user_meta_data->>'tipo_perfil' IN ('ALUNO', 'ENCARREGADO')
ORDER BY created_at DESC
LIMIT 10;

-- 4. Verificar se os triggers existem
SELECT 
    trigger_name, 
    event_manipulation, 
    action_statement
FROM information_schema.triggers
WHERE trigger_name IN ('trigger_create_aluno_profile', 'trigger_create_encarregado_profile');

-- 5. Verificar se as funções helper existem
SELECT 
    routine_name, 
    routine_type
FROM information_schema.routines
WHERE routine_name IN (
    'is_aluno', 
    'is_encarregado', 
    'get_aluno_turma_id',
    'create_aluno_profile',
    'create_encarregado_profile'
);

-- 6. Testar manualmente a função is_aluno (substitua o UUID pelo user_id do aluno)
-- SET LOCAL app.user_id = 'SEU-USER-ID-AQUI';
-- SELECT is_aluno();

-- ============================================
-- SE OS TRIGGERS NÃO EXISTEM, EXECUTE:
-- Os ficheiros de migração:
-- 1. 20251220_cleanup_before_migration.sql
-- 2. 20251220_add_aluno_encarregado_roles.sql
-- ============================================
