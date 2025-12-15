-- ============================================
-- MIGRATION: Fix Escola Notas INSERT/UPDATE Policies
-- Date: 2025-12-15
-- Purpose: Allow schools to insert and update grades for their students
-- ============================================

-- ============================================
-- 1. ADD ESCOLA INSERT POLICY FOR NOTAS
-- ============================================

-- Remove old policy if exists
DROP POLICY IF EXISTS "Escola pode lançar notas" ON notas;

-- Create policy for schools to insert grades
CREATE POLICY "Escola pode lançar notas"
    ON notas FOR INSERT
    WITH CHECK (
        -- Check that the turma belongs to the school
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
        AND
        -- Check that the student belongs to the turma
        aluno_id IN (
            SELECT id FROM alunos WHERE turma_id = notas.turma_id
        )
        AND
        -- Check that the componente belongs to a disciplina in the turma
        componente_id IN (
            SELECT ca.id 
            FROM componentes_avaliacao ca
            JOIN disciplinas d ON d.id = ca.disciplina_id
            WHERE d.turma_id = notas.turma_id
        )
    );

-- ============================================
-- 2. ADD ESCOLA UPDATE POLICY FOR NOTAS
-- ============================================

-- Remove old policy if exists
DROP POLICY IF EXISTS "Escola pode atualizar notas" ON notas;

-- Create policy for schools to update grades
CREATE POLICY "Escola pode atualizar notas"
    ON notas FOR UPDATE
    USING (
        -- Check that the turma belongs to the school
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    )
    WITH CHECK (
        -- Check that the turma belongs to the school
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );

-- ============================================
-- 3. ADD ESCOLA DELETE POLICY FOR NOTAS (Optional)
-- ============================================

-- Remove old policy if exists
DROP POLICY IF EXISTS "Escola pode deletar notas" ON notas;

-- Create policy for schools to delete grades
CREATE POLICY "Escola pode deletar notas"
    ON notas FOR DELETE
    USING (
        -- Check that the turma belongs to the school
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON POLICY "Escola pode lançar notas" ON notas IS 
'Allows schools to insert grades for students in their classes. 
Validates that the turma, aluno, and componente all belong to the school.';

COMMENT ON POLICY "Escola pode atualizar notas" ON notas IS 
'Allows schools to update grades for students in their classes.';

COMMENT ON POLICY "Escola pode deletar notas" ON notas IS 
'Allows schools to delete grades for students in their classes.';
