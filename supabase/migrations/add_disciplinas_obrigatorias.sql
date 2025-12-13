-- Migration: Add disciplinas_obrigatorias table
-- Description: Store which disciplines are mandatory for each turma (for transition rules)
-- Date: 2025-12-11

-- Create table for mandatory disciplines configuration
CREATE TABLE IF NOT EXISTS disciplinas_obrigatorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
    disciplina_id UUID NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
    is_obrigatoria BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(turma_id, disciplina_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_disciplinas_obrigatorias_turma 
ON disciplinas_obrigatorias(turma_id);

CREATE INDEX IF NOT EXISTS idx_disciplinas_obrigatorias_disciplina 
ON disciplinas_obrigatorias(disciplina_id);

-- Add comment
COMMENT ON TABLE disciplinas_obrigatorias IS 
'Stores which disciplines are mandatory for each turma. Used in transition rules (similar to Português and Matemática in I Ciclo).';

-- Enable Row Level Security
ALTER TABLE disciplinas_obrigatorias ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Users can view disciplinas_obrigatorias for their turmas"
ON disciplinas_obrigatorias FOR SELECT
USING (
    turma_id IN (
        SELECT t.id FROM turmas t
        JOIN professores p ON t.professor_id = p.id
        WHERE p.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert disciplinas_obrigatorias for their turmas"
ON disciplinas_obrigatorias FOR INSERT
WITH CHECK (
    turma_id IN (
        SELECT t.id FROM turmas t
        JOIN professores p ON t.professor_id = p.id
        WHERE p.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update disciplinas_obrigatorias for their turmas"
ON disciplinas_obrigatorias FOR UPDATE
USING (
    turma_id IN (
        SELECT t.id FROM turmas t
        JOIN professores p ON t.professor_id = p.id
        WHERE p.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete disciplinas_obrigatorias for their turmas"
ON disciplinas_obrigatorias FOR DELETE
USING (
    turma_id IN (
        SELECT t.id FROM turmas t
        JOIN professores p ON t.professor_id = p.id
        WHERE p.user_id = auth.uid()
    )
);
