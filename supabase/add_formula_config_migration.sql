-- Migration: Add formula configurations table
-- This table stores configurable formulas for NF and MT calculations

-- Create formula_configuracoes table
CREATE TABLE IF NOT EXISTS formula_configuracoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disciplina_id UUID REFERENCES disciplinas(id) ON DELETE CASCADE,
    turma_id UUID REFERENCES turmas(id) ON DELETE CASCADE,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('NF', 'MT')),
    formula_expression TEXT NOT NULL,
    pesos_trimestres JSONB DEFAULT '{"1": 33.33, "2": 33.33, "3": 33.34}'::jsonb,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_formula_config UNIQUE(disciplina_id, turma_id, tipo)
);

-- Add comments
COMMENT ON TABLE formula_configuracoes IS 'Configurações de fórmulas para cálculos de NF e MT';
COMMENT ON COLUMN formula_configuracoes.tipo IS 'Tipo de fórmula: NF (Nota Final) ou MT (Média Trimestral)';
COMMENT ON COLUMN formula_configuracoes.formula_expression IS 'Expressão da fórmula (ex: (T1 + T2 + T3) / 3)';
COMMENT ON COLUMN formula_configuracoes.pesos_trimestres IS 'Pesos percentuais por trimestre para cálculo de MT';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_formula_config_disciplina ON formula_configuracoes(disciplina_id);
CREATE INDEX IF NOT EXISTS idx_formula_config_turma ON formula_configuracoes(turma_id);
CREATE INDEX IF NOT EXISTS idx_formula_config_tipo ON formula_configuracoes(tipo);

-- Insert default MT configuration (média simples)
INSERT INTO formula_configuracoes (disciplina_id, turma_id, tipo, formula_expression, descricao)
SELECT 
    d.id as disciplina_id,
    d.turma_id,
    'MT' as tipo,
    '(T1 + T2 + T3) / 3' as formula_expression,
    'Média Trimestral - Média Simples (padrão)' as descricao
FROM disciplinas d
ON CONFLICT (disciplina_id, turma_id, tipo) DO NOTHING;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_formula_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_formula_config_timestamp ON formula_configuracoes;

CREATE TRIGGER trigger_update_formula_config_timestamp
    BEFORE UPDATE ON formula_configuracoes
    FOR EACH ROW
    EXECUTE FUNCTION update_formula_config_timestamp();
