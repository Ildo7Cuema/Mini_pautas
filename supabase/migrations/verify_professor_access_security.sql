-- ============================================
-- VERIFICAÇÃO: Professor Access Security
-- Date: 2026-01-16
-- Purpose: Diagnostic script to verify RLS policies are working correctly
-- ============================================

-- ============================================
-- 1. VERIFICAR QUE RLS ESTÁ ATIVO
-- ============================================

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'turmas', 
    'disciplinas', 
    'alunos', 
    'notas', 
    'notas_finais', 
    'componentes_avaliacao', 
    'formulas',
    'turma_professores'
)
ORDER BY tablename;

-- ============================================
-- 2. LISTAR TODAS AS POLÍTICAS DE PROFESSOR
-- ============================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual IS NOT NULL as has_using,
    with_check IS NOT NULL as has_with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND (policyname ILIKE '%professor%' OR policyname ILIKE '%prof%')
ORDER BY tablename, policyname;

-- ============================================
-- 3. VERIFICAR FUNÇÕES HELPER EXISTEM
-- ============================================

SELECT 
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'get_professor_turma_ids',
    'get_professor_disciplina_ids',
    'can_professor_grade_component',
    'get_professor_id'
);

-- ============================================
-- 4. TESTE DE ACESSO PARA UM PROFESSOR ESPECÍFICO
-- Execute como administrador (service role) para simular acesso
-- ============================================

-- Substitua 'EMAIL_DO_PROFESSOR' pelo email real do professor para testar
DO $$
DECLARE
    v_professor_user_id UUID;
    v_professor_id UUID;
    v_turma_count INT;
    v_disciplina_count INT;
BEGIN
    -- Obter user_id do professor pelo email
    -- SELECT id INTO v_professor_user_id FROM auth.users WHERE email = 'EMAIL_DO_PROFESSOR';
    
    -- Se tiver um user_id específico, descomente abaixo:
    -- v_professor_user_id := 'seu-uuid-aqui';
    
    IF v_professor_user_id IS NOT NULL THEN
        -- Contar turmas atribuídas
        SELECT COUNT(*) INTO v_turma_count
        FROM turma_professores tp
        JOIN professores p ON p.id = tp.professor_id
        WHERE p.user_id = v_professor_user_id;
        
        -- Contar disciplinas atribuídas
        SELECT COUNT(*) INTO v_disciplina_count
        FROM turma_professores tp
        JOIN professores p ON p.id = tp.professor_id
        WHERE p.user_id = v_professor_user_id;
        
        RAISE NOTICE 'Professor tem % turmas e % disciplinas atribuídas', v_turma_count, v_disciplina_count;
    ELSE
        RAISE NOTICE 'Para testar, defina v_professor_user_id com um UUID válido';
    END IF;
END $$;

-- ============================================
-- 5. LISTAR PROFESSORES E SUAS ATRIBUIÇÕES
-- ============================================

SELECT 
    p.nome_completo as professor,
    p.email,
    COUNT(DISTINCT tp.turma_id) as total_turmas,
    COUNT(DISTINCT tp.disciplina_id) as total_disciplinas,
    ARRAY_AGG(DISTINCT t.nome) as turmas
FROM professores p
LEFT JOIN turma_professores tp ON tp.professor_id = p.id
LEFT JOIN turmas t ON t.id = tp.turma_id
GROUP BY p.id, p.nome_completo, p.email
ORDER BY p.nome_completo;

-- ============================================
-- 6. VERIFICAR SE HÁ CONFLITOS DE POLÍTICAS
-- ============================================

-- Contar políticas por tabela (muitas políticas podem indicar conflitos)
SELECT 
    tablename,
    COUNT(*) as num_policies,
    ARRAY_AGG(policyname) as policies
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('turmas', 'disciplinas', 'alunos', 'notas', 'notas_finais', 'componentes_avaliacao', 'formulas')
GROUP BY tablename
ORDER BY num_policies DESC;

-- ============================================
-- FIM DA VERIFICAÇÃO
-- ============================================
