-- Migration: Add configuracao_cabecalho table
-- Description: Table to store configurable header settings for Mini-Pauta documents
-- Created: 2025-12-08

-- Create table for header configuration
CREATE TABLE IF NOT EXISTS configuracao_cabecalho (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    escola_id UUID REFERENCES escolas(id) ON DELETE CASCADE,
    
    -- Logo configuration
    logo_url TEXT,
    logo_width INTEGER DEFAULT 50,
    logo_height INTEGER DEFAULT 50,
    
    -- Hierarchical information
    mostrar_republica BOOLEAN DEFAULT true,
    texto_republica TEXT DEFAULT 'República de Angola',
    
    mostrar_governo_provincial BOOLEAN DEFAULT true,
    provincia TEXT,
    
    mostrar_orgao_educacao BOOLEAN DEFAULT true,
    nivel_ensino TEXT, -- 'Ensino Secundário' ou 'Ensino Primário'
    municipio TEXT,
    
    nome_escola TEXT NOT NULL,
    
    -- Style configuration
    tamanho_fonte_mini_pauta INTEGER DEFAULT 16,
    tamanho_fonte_outros INTEGER DEFAULT 10,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, escola_id)
);

-- Enable Row Level Security
ALTER TABLE configuracao_cabecalho ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own header configs"
    ON configuracao_cabecalho FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own header configs"
    ON configuracao_cabecalho FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own header configs"
    ON configuracao_cabecalho FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own header configs"
    ON configuracao_cabecalho FOR DELETE
    USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_configuracao_cabecalho_updated_at
    BEFORE UPDATE ON configuracao_cabecalho
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_configuracao_cabecalho_user_id ON configuracao_cabecalho(user_id);
CREATE INDEX idx_configuracao_cabecalho_escola_id ON configuracao_cabecalho(escola_id);
