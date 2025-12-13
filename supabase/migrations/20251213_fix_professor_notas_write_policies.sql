-- ============================================
-- MIGRATION: Fix Professor Notas INSERT/UPDATE Policies
-- Date: 2025-12-13
-- Purpose: Allow professors to insert and update grades for their students
-- ============================================

-- ============================================
-- 1. FIX NOTAS INSERT POLICY
-- ============================================

-- Remove old policy if exists
DROP POLICY IF EXISTS "Professors can insert grades for their classes" ON notas;

-- Create policy for professors to insert grades
CREATE POLICY "Professors can insert grades for their classes"
    ON notas FOR INSERT
    WITH CHECK (
        -- Check that the turma belongs to the professor
        turma_id IN (
            SELECT DISTINCT d.turma_id 
            FROM disciplinas d
            WHERE d.professor_id IN (
                SELECT id FROM professores WHERE user_id = auth.uid()
            )
        )
        AND
        -- Check that lancado_por is the current professor
        lancado_por IN (
            SELECT id FROM professores WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- 2. FIX NOTAS UPDATE POLICY
-- ============================================

-- Remove old policy if exists
DROP POLICY IF EXISTS "Professors can update grades for their classes" ON notas;

-- Create policy for professors to update grades
CREATE POLICY "Professors can update grades for their classes"
    ON notas FOR UPDATE
    USING (
        turma_id IN (
            SELECT DISTINCT d.turma_id 
            FROM disciplinas d
            WHERE d.professor_id IN (
                SELECT id FROM professores WHERE user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        turma_id IN (
            SELECT DISTINCT d.turma_id 
            FROM disciplinas d
            WHERE d.professor_id IN (
                SELECT id FROM professores WHERE user_id = auth.uid()
            )
        )
    );

-- ============================================
-- 3. VERIFY NOTAS DELETE POLICY (Optional)
-- ============================================

-- Remove old policy if exists
DROP POLICY IF EXISTS "Professors can delete grades for their classes" ON notas;

-- Create policy for professors to delete grades (optional, if needed)
CREATE POLICY "Professors can delete grades for their classes"
    ON notas FOR DELETE
    USING (
        turma_id IN (
            SELECT DISTINCT d.turma_id 
            FROM disciplinas d
            WHERE d.professor_id IN (
                SELECT id FROM professores WHERE user_id = auth.uid()
            )
        )
    );

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON POLICY "Professors can insert grades for their classes" ON notas IS 
'Allows professors to insert grades for students in their classes. 
Validates that the turma belongs to the professor and lancado_por is the current professor.';

COMMENT ON POLICY "Professors can update grades for their classes" ON notas IS 
'Allows professors to update grades for students in their classes.';

COMMENT ON POLICY "Professors can delete grades for their classes" ON notas IS 
'Allows professors to delete grades for students in their classes (if needed).';
