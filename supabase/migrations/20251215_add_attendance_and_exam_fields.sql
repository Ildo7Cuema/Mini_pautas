-- ============================================
-- MIGRATION: Add Attendance and Exam Fields
-- Date: 2025-12-15
-- Description: Add fields to support Angolan education system evaluation rules
-- ============================================

-- Add attendance and exam-related fields to alunos table
ALTER TABLE alunos
ADD COLUMN IF NOT EXISTS frequencia_anual NUMERIC(5,2) DEFAULT NULL 
    CHECK (frequencia_anual >= 0 AND frequencia_anual <= 100),
ADD COLUMN IF NOT EXISTS tipo_exame TEXT DEFAULT NULL 
    CHECK (tipo_exame IN ('Nacional', 'Extraordinário', 'Recurso')),
ADD COLUMN IF NOT EXISTS motivo_retencao TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS observacao_transicao TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS matricula_condicional BOOLEAN DEFAULT false;

-- Add comments to document the fields
COMMENT ON COLUMN alunos.frequencia_anual IS 'Percentual de frequência anual do aluno (0-100%). Mínimo de 66.67% para transitar.';
COMMENT ON COLUMN alunos.tipo_exame IS 'Tipo de exame que o aluno deve realizar: Nacional (classes terminais), Extraordinário (matrícula condicional), ou Recurso.';
COMMENT ON COLUMN alunos.motivo_retencao IS 'Motivo detalhado da retenção quando o aluno não transita.';
COMMENT ON COLUMN alunos.observacao_transicao IS 'Observação padronizada sobre a transição do aluno conforme regras oficiais.';
COMMENT ON COLUMN alunos.matricula_condicional IS 'Indica se o aluno está em matrícula condicional (7ª e 8ª classes com até 2 disciplinas entre 7-9).';

-- Create index for performance on frequently queried fields
CREATE INDEX IF NOT EXISTS idx_alunos_frequencia ON alunos(frequencia_anual) WHERE frequencia_anual IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alunos_matricula_condicional ON alunos(matricula_condicional) WHERE matricula_condicional = true;
CREATE INDEX IF NOT EXISTS idx_alunos_tipo_exame ON alunos(tipo_exame) WHERE tipo_exame IS NOT NULL;

-- ============================================
-- VALIDATION FUNCTION
-- ============================================

-- Function to validate attendance and transition rules
CREATE OR REPLACE FUNCTION validate_student_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- If frequencia_anual is set and below minimum, ensure matricula_condicional is false
    IF NEW.frequencia_anual IS NOT NULL AND NEW.frequencia_anual < 66.67 THEN
        NEW.matricula_condicional := false;
        
        -- Set default retention reason if not provided
        IF NEW.motivo_retencao IS NULL OR NEW.motivo_retencao = '' THEN
            NEW.motivo_retencao := 'Frequência insuficiente (' || ROUND(NEW.frequencia_anual, 2) || '%, inferior ao mínimo de 66,67%)';
        END IF;
        
        -- Set default observation if not provided
        IF NEW.observacao_transicao IS NULL OR NEW.observacao_transicao = '' THEN
            NEW.observacao_transicao := 'Não transitou por frequência insuficiente (' || ROUND(NEW.frequencia_anual, 2) || '%, inferior ao mínimo de 66,67%).';
        END IF;
    END IF;
    
    -- If matricula_condicional is true, ensure tipo_exame is set to Extraordinário
    IF NEW.matricula_condicional = true AND (NEW.tipo_exame IS NULL OR NEW.tipo_exame = '') THEN
        NEW.tipo_exame := 'Extraordinário';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate student transition
DROP TRIGGER IF EXISTS trigger_validate_student_transition ON alunos;
CREATE TRIGGER trigger_validate_student_transition
    BEFORE INSERT OR UPDATE ON alunos
    FOR EACH ROW
    EXECUTE FUNCTION validate_student_transition();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify columns were added
DO $$
DECLARE
    missing_columns TEXT[];
BEGIN
    SELECT ARRAY_AGG(column_name)
    INTO missing_columns
    FROM (
        SELECT unnest(ARRAY['frequencia_anual', 'tipo_exame', 'motivo_retencao', 'observacao_transicao', 'matricula_condicional']) AS column_name
    ) expected
    WHERE column_name NOT IN (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'alunos'
    );
    
    IF missing_columns IS NOT NULL AND array_length(missing_columns, 1) > 0 THEN
        RAISE EXCEPTION 'Migration failed: Missing columns: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE 'Migration successful: All columns added to alunos table';
    END IF;
END $$;
