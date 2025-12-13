-- ============================================
-- MIGRATION 002: Add Turma-Professores Association Table
-- Purpose: Enable many-to-many relationship between teachers, classes, and subjects
-- ============================================

-- Create turma_professores junction table
CREATE TABLE IF NOT EXISTS turma_professores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
    professor_id UUID NOT NULL REFERENCES professores(id) ON DELETE CASCADE,
    disciplina_id UUID NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_turma_professor_disciplina UNIQUE (turma_id, professor_id, disciplina_id)
);

-- Create indexes for performance
CREATE INDEX idx_turma_professores_turma ON turma_professores(turma_id);
CREATE INDEX idx_turma_professores_professor ON turma_professores(professor_id);
CREATE INDEX idx_turma_professores_disciplina ON turma_professores(disciplina_id);
CREATE INDEX idx_turma_professores_lookup ON turma_professores(professor_id, turma_id);

-- Add updated_at trigger
CREATE TRIGGER update_turma_professores_updated_at 
    BEFORE UPDATE ON turma_professores
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add audit trigger
CREATE TRIGGER audit_turma_professores 
    AFTER INSERT OR UPDATE OR DELETE ON turma_professores
    FOR EACH ROW 
    EXECUTE FUNCTION audit_trigger_function();

-- Enable RLS
ALTER TABLE turma_professores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for turma_professores

-- Schools can view all associations for their school
CREATE POLICY "Schools can view their teacher associations"
    ON turma_professores FOR SELECT
    USING (
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );

-- Schools can create associations
CREATE POLICY "Schools can create teacher associations"
    ON turma_professores FOR INSERT
    WITH CHECK (
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );

-- Schools can update associations
CREATE POLICY "Schools can update teacher associations"
    ON turma_professores FOR UPDATE
    USING (
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );

-- Schools can delete associations
CREATE POLICY "Schools can delete teacher associations"
    ON turma_professores FOR DELETE
    USING (
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );

-- Professors can view their own associations
CREATE POLICY "Professors can view own associations"
    ON turma_professores FOR SELECT
    USING (
        professor_id IN (
            SELECT id FROM professores WHERE user_id = auth.uid()
        )
    );

-- Function to validate association integrity
CREATE OR REPLACE FUNCTION validate_turma_professor_association()
RETURNS TRIGGER AS $$
DECLARE
    v_turma_escola_id UUID;
    v_professor_escola_id UUID;
    v_disciplina_turma_id UUID;
    v_disciplina_professor_id UUID;
BEGIN
    -- Get escola_id from turma
    SELECT escola_id INTO v_turma_escola_id
    FROM turmas WHERE id = NEW.turma_id;
    
    -- Get escola_id from professor
    SELECT escola_id INTO v_professor_escola_id
    FROM professores WHERE id = NEW.professor_id;
    
    -- Get turma_id and professor_id from disciplina
    SELECT turma_id, professor_id INTO v_disciplina_turma_id, v_disciplina_professor_id
    FROM disciplinas WHERE id = NEW.disciplina_id;
    
    -- Validate that professor belongs to the same school as turma
    IF v_turma_escola_id != v_professor_escola_id THEN
        RAISE EXCEPTION 'Professor must belong to the same school as the turma';
    END IF;
    
    -- Validate that disciplina belongs to the turma
    IF v_disciplina_turma_id != NEW.turma_id THEN
        RAISE EXCEPTION 'Disciplina must belong to the specified turma';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate associations
CREATE TRIGGER validate_association_before_insert
    BEFORE INSERT OR UPDATE ON turma_professores
    FOR EACH ROW
    EXECUTE FUNCTION validate_turma_professor_association();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON turma_professores TO authenticated;

-- Comments for documentation
COMMENT ON TABLE turma_professores IS 'Many-to-many association between teachers, classes, and subjects';
COMMENT ON COLUMN turma_professores.turma_id IS 'Reference to the class';
COMMENT ON COLUMN turma_professores.professor_id IS 'Reference to the teacher';
COMMENT ON COLUMN turma_professores.disciplina_id IS 'Reference to the subject the teacher teaches in this class';
