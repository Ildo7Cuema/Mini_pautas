-- ============================================
-- MIGRATION 003: Update RLS Policies for Multi-Tenant Architecture
-- Purpose: Rewrite all RLS policies to support ESCOLA and PROFESSOR roles with data isolation
-- ============================================

-- ============================================
-- DROP EXISTING POLICIES
-- ============================================

-- Drop existing policies on escolas
DROP POLICY IF EXISTS "Professors can view own profile" ON professores;
DROP POLICY IF EXISTS "Professors can update own profile" ON professores;

-- Drop existing policies on turmas
DROP POLICY IF EXISTS "Professors can view own classes" ON turmas;
DROP POLICY IF EXISTS "Professors can create classes" ON turmas;
DROP POLICY IF EXISTS "Professors can update own classes" ON turmas;

-- Drop existing policies on alunos
DROP POLICY IF EXISTS "Professors can view students in their classes" ON alunos;
DROP POLICY IF EXISTS "Students can view own profile" ON alunos;
DROP POLICY IF EXISTS "Professors can manage students in their classes" ON alunos;

-- Drop existing policies on disciplinas
DROP POLICY IF EXISTS "Professors can view own disciplines" ON disciplinas;
DROP POLICY IF EXISTS "Professors can manage own disciplines" ON disciplinas;

-- Drop existing policies on componentes_avaliacao
DROP POLICY IF EXISTS "Professors can view components for their disciplines" ON componentes_avaliacao;
DROP POLICY IF EXISTS "Professors can manage components for their disciplines" ON componentes_avaliacao;

-- Drop existing policies on formulas
DROP POLICY IF EXISTS "Professors can view formulas for their classes" ON formulas;
DROP POLICY IF EXISTS "Professors can manage formulas for their classes" ON formulas;

-- Drop existing policies on notas
DROP POLICY IF EXISTS "Professors can view grades for their classes" ON notas;
DROP POLICY IF EXISTS "Professors can insert grades for their classes" ON notas;
DROP POLICY IF EXISTS "Professors can update grades for their classes" ON notas;
DROP POLICY IF EXISTS "Students can view own grades" ON notas;

-- Drop existing policies on notas_finais
DROP POLICY IF EXISTS "Professors can view final grades for their classes" ON notas_finais;
DROP POLICY IF EXISTS "Professors can manage final grades for their classes" ON notas_finais;
DROP POLICY IF EXISTS "Students can view own final grades" ON notas_finais;

-- ============================================
-- ESCOLAS POLICIES
-- ============================================

-- Schools can view their own record
CREATE POLICY "Escolas podem ver próprio registro"
    ON escolas FOR SELECT
    USING (
        user_id = auth.uid() 
        OR id IN (
            SELECT escola_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

-- Schools can update their own record
CREATE POLICY "Escolas podem atualizar próprio registro"
    ON escolas FOR UPDATE
    USING (user_id = auth.uid());

-- Schools can insert their own record (for registration)
CREATE POLICY "Escolas podem criar próprio registro"
    ON escolas FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- PROFESSORES POLICIES
-- ============================================

-- Schools can view all their teachers
CREATE POLICY "Escola pode ver seus professores"
    ON professores FOR SELECT
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
        )
        OR user_id = auth.uid()
    );

-- Schools can create teachers
CREATE POLICY "Escola pode criar professores"
    ON professores FOR INSERT
    WITH CHECK (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
        )
    );

-- Schools can update their teachers
CREATE POLICY "Escola pode atualizar seus professores"
    ON professores FOR UPDATE
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
        )
    );

-- Schools can delete their teachers
CREATE POLICY "Escola pode deletar seus professores"
    ON professores FOR DELETE
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
        )
    );

-- Professors can update their own profile
CREATE POLICY "Professor pode atualizar próprio perfil"
    ON professores FOR UPDATE
    USING (user_id = auth.uid());

-- ============================================
-- TURMAS POLICIES
-- ============================================

-- Schools can view all their classes
CREATE POLICY "Escola pode ver suas turmas"
    ON turmas FOR SELECT
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
        )
    );

-- Schools can create classes
CREATE POLICY "Escola pode criar turmas"
    ON turmas FOR INSERT
    WITH CHECK (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
        )
    );

-- Schools can update their classes
CREATE POLICY "Escola pode atualizar suas turmas"
    ON turmas FOR UPDATE
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
        )
    );

-- Schools can delete their classes
CREATE POLICY "Escola pode deletar suas turmas"
    ON turmas FOR DELETE
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
        )
    );

-- Professors can view only their assigned classes
CREATE POLICY "Professor pode ver turmas associadas"
    ON turmas FOR SELECT
    USING (
        id IN (
            SELECT tp.turma_id 
            FROM turma_professores tp
            JOIN professores p ON p.id = tp.professor_id
            WHERE p.user_id = auth.uid()
        )
    );

-- ============================================
-- ALUNOS POLICIES
-- ============================================

-- Schools can view all their students
CREATE POLICY "Escola pode ver seus alunos"
    ON alunos FOR SELECT
    USING (
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );

-- Schools can create students
CREATE POLICY "Escola pode criar alunos"
    ON alunos FOR INSERT
    WITH CHECK (
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );

-- Schools can update their students
CREATE POLICY "Escola pode atualizar seus alunos"
    ON alunos FOR UPDATE
    USING (
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );

-- Schools can delete their students
CREATE POLICY "Escola pode deletar seus alunos"
    ON alunos FOR DELETE
    USING (
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );

-- Professors can view students in their assigned classes
CREATE POLICY "Professor pode ver alunos das suas turmas"
    ON alunos FOR SELECT
    USING (
        turma_id IN (
            SELECT tp.turma_id 
            FROM turma_professores tp
            JOIN professores p ON p.id = tp.professor_id
            WHERE p.user_id = auth.uid()
        )
    );

-- ============================================
-- DISCIPLINAS POLICIES
-- ============================================

-- Schools can view all disciplines in their classes
CREATE POLICY "Escola pode ver disciplinas das suas turmas"
    ON disciplinas FOR SELECT
    USING (
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );

-- Schools can create disciplines
CREATE POLICY "Escola pode criar disciplinas"
    ON disciplinas FOR INSERT
    WITH CHECK (
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );

-- Schools can update disciplines
CREATE POLICY "Escola pode atualizar disciplinas"
    ON disciplinas FOR UPDATE
    USING (
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );

-- Schools can delete disciplines
CREATE POLICY "Escola pode deletar disciplinas"
    ON disciplinas FOR DELETE
    USING (
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );

-- Professors can view their assigned disciplines
CREATE POLICY "Professor pode ver suas disciplinas"
    ON disciplinas FOR SELECT
    USING (
        id IN (
            SELECT tp.disciplina_id 
            FROM turma_professores tp
            JOIN professores p ON p.id = tp.professor_id
            WHERE p.user_id = auth.uid()
        )
    );

-- Professors can update their assigned disciplines
CREATE POLICY "Professor pode atualizar suas disciplinas"
    ON disciplinas FOR UPDATE
    USING (
        id IN (
            SELECT tp.disciplina_id 
            FROM turma_professores tp
            JOIN professores p ON p.id = tp.professor_id
            WHERE p.user_id = auth.uid()
        )
    );

-- ============================================
-- COMPONENTES_AVALIACAO POLICIES
-- ============================================

-- Schools can manage all components in their school
CREATE POLICY "Escola pode gerenciar componentes"
    ON componentes_avaliacao FOR ALL
    USING (
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );

-- Professors can view components for their disciplines
CREATE POLICY "Professor pode ver componentes das suas disciplinas"
    ON componentes_avaliacao FOR SELECT
    USING (
        disciplina_id IN (
            SELECT tp.disciplina_id 
            FROM turma_professores tp
            JOIN professores p ON p.id = tp.professor_id
            WHERE p.user_id = auth.uid()
        )
    );

-- Professors can manage components for their disciplines
CREATE POLICY "Professor pode gerenciar componentes das suas disciplinas"
    ON componentes_avaliacao FOR ALL
    USING (
        disciplina_id IN (
            SELECT tp.disciplina_id 
            FROM turma_professores tp
            JOIN professores p ON p.id = tp.professor_id
            WHERE p.user_id = auth.uid()
        )
    );

-- ============================================
-- FORMULAS POLICIES
-- ============================================

-- Schools can manage all formulas
CREATE POLICY "Escola pode gerenciar fórmulas"
    ON formulas FOR ALL
    USING (
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );

-- Professors can view formulas for their classes
CREATE POLICY "Professor pode ver fórmulas das suas turmas"
    ON formulas FOR SELECT
    USING (
        turma_id IN (
            SELECT tp.turma_id 
            FROM turma_professores tp
            JOIN professores p ON p.id = tp.professor_id
            WHERE p.user_id = auth.uid()
        )
    );

-- Professors can manage formulas for their disciplines
CREATE POLICY "Professor pode gerenciar fórmulas das suas disciplinas"
    ON formulas FOR ALL
    USING (
        turma_id IN (
            SELECT tp.turma_id 
            FROM turma_professores tp
            JOIN professores p ON p.id = tp.professor_id
            WHERE p.user_id = auth.uid()
        )
        AND disciplina_id IN (
            SELECT tp.disciplina_id 
            FROM turma_professores tp
            JOIN professores p ON p.id = tp.professor_id
            WHERE p.user_id = auth.uid()
        )
    );

-- ============================================
-- NOTAS POLICIES
-- ============================================

-- Schools can view all grades
CREATE POLICY "Escola pode ver todas as notas"
    ON notas FOR SELECT
    USING (
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );

-- Professors can view grades for their classes
CREATE POLICY "Professor pode ver notas das suas turmas"
    ON notas FOR SELECT
    USING (
        turma_id IN (
            SELECT tp.turma_id 
            FROM turma_professores tp
            JOIN professores p ON p.id = tp.professor_id
            WHERE p.user_id = auth.uid()
        )
    );

-- Professors can insert grades only for their assigned classes/disciplines
CREATE POLICY "Professor pode lançar notas nas suas turmas"
    ON notas FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM turma_professores tp
            JOIN professores p ON p.id = tp.professor_id
            JOIN componentes_avaliacao ca ON ca.disciplina_id = tp.disciplina_id
            WHERE p.user_id = auth.uid()
                AND tp.turma_id = notas.turma_id
                AND ca.id = notas.componente_id
        )
        AND lancado_por IN (
            SELECT id FROM professores WHERE user_id = auth.uid()
        )
    );

-- Professors can update grades they entered
CREATE POLICY "Professor pode atualizar notas que lançou"
    ON notas FOR UPDATE
    USING (
        lancado_por IN (
            SELECT id FROM professores WHERE user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 
            FROM turma_professores tp
            JOIN professores p ON p.id = tp.professor_id
            JOIN componentes_avaliacao ca ON ca.disciplina_id = tp.disciplina_id
            WHERE p.user_id = auth.uid()
                AND tp.turma_id = notas.turma_id
                AND ca.id = notas.componente_id
        )
    );

-- ============================================
-- NOTAS_FINAIS POLICIES
-- ============================================

-- Schools can view all final grades
CREATE POLICY "Escola pode ver todas as notas finais"
    ON notas_finais FOR SELECT
    USING (
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );

-- Professors can view final grades for their classes
CREATE POLICY "Professor pode ver notas finais das suas turmas"
    ON notas_finais FOR SELECT
    USING (
        turma_id IN (
            SELECT tp.turma_id 
            FROM turma_professores tp
            JOIN professores p ON p.id = tp.professor_id
            WHERE p.user_id = auth.uid()
        )
        AND disciplina_id IN (
            SELECT tp.disciplina_id 
            FROM turma_professores tp
            JOIN professores p ON p.id = tp.professor_id
            WHERE p.user_id = auth.uid()
        )
    );

-- Professors can manage final grades for their disciplines
CREATE POLICY "Professor pode gerenciar notas finais das suas disciplinas"
    ON notas_finais FOR ALL
    USING (
        turma_id IN (
            SELECT tp.turma_id 
            FROM turma_professores tp
            JOIN professores p ON p.id = tp.professor_id
            WHERE p.user_id = auth.uid()
        )
        AND disciplina_id IN (
            SELECT tp.disciplina_id 
            FROM turma_professores tp
            JOIN professores p ON p.id = tp.professor_id
            WHERE p.user_id = auth.uid()
        )
    );

-- Schools can manage all final grades
CREATE POLICY "Escola pode gerenciar todas as notas finais"
    ON notas_finais FOR ALL
    USING (
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );
