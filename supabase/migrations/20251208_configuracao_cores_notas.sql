-- Migration: Add configuracao_cores_notas tables
-- Description: Tables to store configurable grade color settings and rules
-- Created: 2025-12-08

-- Create table for color configuration
CREATE TABLE IF NOT EXISTS configuracao_cores_notas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    turma_id UUID REFERENCES turmas(id) ON DELETE CASCADE,
    
    -- Cores (formato hex)
    cor_negativa TEXT NOT NULL DEFAULT '#dc2626',  -- red-600
    cor_positiva TEXT NOT NULL DEFAULT '#2563eb',  -- blue-600
    
    -- Metadados
    nome TEXT NOT NULL,
    descricao TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Uma configuração por turma ou uma global por usuário (turma_id NULL)
    UNIQUE(user_id, turma_id)
);

-- Create table for color rules
CREATE TABLE IF NOT EXISTS regras_cores_notas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_id UUID REFERENCES configuracao_cores_notas(id) ON DELETE CASCADE,
    
    -- Condições de aplicação
    nivel_ensino TEXT,  -- 'Ensino Primário', 'Ensino Secundário', etc. NULL = todos
    classe_min INTEGER,  -- NULL = sem mínimo
    classe_max INTEGER,  -- NULL = sem máximo
    tipo_componente TEXT NOT NULL CHECK (tipo_componente IN ('calculado', 'regular', 'todos')),
    
    -- Regra de threshold
    threshold NUMERIC NOT NULL,
    operador TEXT NOT NULL CHECK (operador IN ('<=', '<', '>=', '>')),
    
    -- Comportamento
    aplicar_cor BOOLEAN NOT NULL DEFAULT true,  -- Se false, sempre usa cor positiva
    
    -- Ordenação para prioridade de aplicação (menor = maior prioridade)
    ordem INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE configuracao_cores_notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE regras_cores_notas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for configuracao_cores_notas
CREATE POLICY "Users can view their own color configurations"
    ON configuracao_cores_notas FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own color configurations"
    ON configuracao_cores_notas FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own color configurations"
    ON configuracao_cores_notas FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own color configurations"
    ON configuracao_cores_notas FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for regras_cores_notas
CREATE POLICY "Users can view rules for their configurations"
    ON regras_cores_notas FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM configuracao_cores_notas
            WHERE id = regras_cores_notas.config_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert rules for their configurations"
    ON regras_cores_notas FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM configuracao_cores_notas
            WHERE id = regras_cores_notas.config_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update rules for their configurations"
    ON regras_cores_notas FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM configuracao_cores_notas
            WHERE id = regras_cores_notas.config_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete rules for their configurations"
    ON regras_cores_notas FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM configuracao_cores_notas
            WHERE id = regras_cores_notas.config_id
            AND user_id = auth.uid()
        )
    );

-- Create indexes for better performance
CREATE INDEX idx_configuracao_cores_user ON configuracao_cores_notas(user_id);
CREATE INDEX idx_configuracao_cores_turma ON configuracao_cores_notas(turma_id);
CREATE INDEX idx_regras_cores_config ON regras_cores_notas(config_id);
CREATE INDEX idx_regras_cores_ordem ON regras_cores_notas(config_id, ordem);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_configuracao_cores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER configuracao_cores_updated_at
    BEFORE UPDATE ON configuracao_cores_notas
    FOR EACH ROW
    EXECUTE FUNCTION update_configuracao_cores_updated_at();
