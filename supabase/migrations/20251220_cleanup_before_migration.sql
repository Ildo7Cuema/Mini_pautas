-- ============================================
-- CLEANUP: Drop existing ALUNO/ENCARREGADO policies before re-applying
-- Run this FIRST in Supabase SQL Editor
-- ============================================

-- Drop ALUNO policies
DROP POLICY IF EXISTS "ALUNO can view own aluno record" ON alunos;
DROP POLICY IF EXISTS "ALUNO can view own turma" ON turmas;
DROP POLICY IF EXISTS "ALUNO can view own escola" ON escolas;
DROP POLICY IF EXISTS "ALUNO can view own disciplinas" ON disciplinas;
DROP POLICY IF EXISTS "ALUNO can view own componentes" ON componentes_avaliacao;
DROP POLICY IF EXISTS "ALUNO can view own notas" ON notas;
DROP POLICY IF EXISTS "ALUNO can view own notas_finais" ON notas_finais;
DROP POLICY IF EXISTS "ALUNO can view own user_profile" ON user_profiles;
DROP POLICY IF EXISTS "ALUNO can view own notificacoes" ON notificacoes;
DROP POLICY IF EXISTS "ALUNO can update own notificacoes" ON notificacoes;

-- Drop ENCARREGADO policies
DROP POLICY IF EXISTS "ENCARREGADO can view associated alunos" ON alunos;
DROP POLICY IF EXISTS "ENCARREGADO can view associated turmas" ON turmas;
DROP POLICY IF EXISTS "ENCARREGADO can view associated escolas" ON escolas;
DROP POLICY IF EXISTS "ENCARREGADO can view associated disciplinas" ON disciplinas;
DROP POLICY IF EXISTS "ENCARREGADO can view associated componentes" ON componentes_avaliacao;
DROP POLICY IF EXISTS "ENCARREGADO can view associated notas" ON notas;
DROP POLICY IF EXISTS "ENCARREGADO can view associated notas_finais" ON notas_finais;
DROP POLICY IF EXISTS "ENCARREGADO can view own user_profile" ON user_profiles;
DROP POLICY IF EXISTS "ENCARREGADO can view own notificacoes" ON notificacoes;
DROP POLICY IF EXISTS "ENCARREGADO can update own notificacoes" ON notificacoes;

-- Drop helper functions
DROP FUNCTION IF EXISTS is_aluno();
DROP FUNCTION IF EXISTS is_encarregado();
DROP FUNCTION IF EXISTS get_aluno_turma_id();
DROP FUNCTION IF EXISTS get_aluno_id();
DROP FUNCTION IF EXISTS get_encarregado_turma_ids();
DROP FUNCTION IF EXISTS get_encarregado_aluno_ids();
DROP FUNCTION IF EXISTS get_aluno_escola_id();
DROP FUNCTION IF EXISTS get_aluno_escola_id(UUID);
DROP FUNCTION IF EXISTS get_current_aluno_id();
DROP FUNCTION IF EXISTS aluno_escola_matches_profile();
DROP FUNCTION IF EXISTS create_aluno_profile() CASCADE;
DROP FUNCTION IF EXISTS create_encarregado_profile() CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_create_aluno_profile ON alunos;
DROP TRIGGER IF EXISTS trigger_create_encarregado_profile ON alunos;

-- ============================================
-- CLEANUP COMPLETE - Now run the main migration
-- ============================================
