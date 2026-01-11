-- ============================================
-- MIGRATION: Add custom document templates (Modelos de Documento)
-- Purpose: Allow Municipal Directorates to customize document templates
-- Date: 2026-01-11
-- ============================================

-- ============================================
-- PHASE 1: Create modelos_documento table
-- ============================================

CREATE TABLE IF NOT EXISTS modelos_documento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    municipio TEXT NOT NULL,
    tipo_documento_id UUID NOT NULL REFERENCES tipos_documento(id),
    nome TEXT NOT NULL, -- nome do modelo, ex: "Declaração Padrão 2026"
    
    -- Configuração do Conteúdo
    conteudo_html TEXT NOT NULL, -- O corpo rich text
    
    -- Configuração do Cabeçalho
    cabecalho_config JSONB DEFAULT '{
        "mostrar": true,
        "texto": "",
        "logo_url": null,
        "alinhamento": "center"
    }'::jsonb,
    
    -- Configuração do Rodapé
    rodape_config JSONB DEFAULT '{
        "mostrar": true,
        "texto": "",
        "alinhamento": "center"
    }'::jsonb,
    
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    -- Um município pode ter vários modelos, mas idealmente um "padrão" por tipo (a ser gerido na logica ou flag futura)
    CONSTRAINT fk_tipo_documento FOREIGN KEY (tipo_documento_id) REFERENCES tipos_documento(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_modelos_municipio ON modelos_documento(municipio);
CREATE INDEX IF NOT EXISTS idx_modelos_tipo_documento ON modelos_documento(tipo_documento_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_modelos_documento_updated_at ON modelos_documento;
CREATE TRIGGER update_modelos_documento_updated_at
    BEFORE UPDATE ON modelos_documento
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE modelos_documento IS 'Custom document templates for each municipality';

-- ============================================
-- PHASE 2: RLS Policies for modelos_documento
-- ============================================

ALTER TABLE modelos_documento ENABLE ROW LEVEL SECURITY;

-- Helper function reuse: get_direcao_municipio() (already exists from previous migrations)
-- Helper function reuse: is_direcao_municipal() (already exists)

-- Policy: Direção Municipal can VIEW their own models
CREATE POLICY "Direcao Municipal can view own models"
    ON modelos_documento FOR SELECT
    USING (
        (is_direcao_municipal() AND municipio = get_direcao_municipio())
        OR 
        -- Allow finding global templates if we implement them, currently null/superuser
        (auth.uid() IN (SELECT user_id FROM user_profiles WHERE tipo_perfil = 'SUPERADMIN'))
    );

-- Policy: Direção Municipal can INSERT their own models
CREATE POLICY "Direcao Municipal can insert own models"
    ON modelos_documento FOR INSERT
    WITH CHECK (
        is_direcao_municipal() AND municipio = get_direcao_municipio()
    );

-- Policy: Direção Municipal can UPDATE their own models
CREATE POLICY "Direcao Municipal can update own models"
    ON modelos_documento FOR UPDATE
    USING (
        is_direcao_municipal() AND municipio = get_direcao_municipio()
    );

-- Policy: Direção Municipal can DELETE their own models
CREATE POLICY "Direcao Municipal can delete own models"
    ON modelos_documento FOR DELETE
    USING (
        is_direcao_municipal() AND municipio = get_direcao_municipio()
    );

-- Policy: SUPERADMIN full access
CREATE POLICY "SUPERADMIN can manage all models"
    ON modelos_documento FOR ALL
    USING (is_superadmin());

-- ============================================
-- PHASE 3: Grant Permissions
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON modelos_documento TO authenticated;

-- ============================================
-- END OF MIGRATION
-- ============================================
