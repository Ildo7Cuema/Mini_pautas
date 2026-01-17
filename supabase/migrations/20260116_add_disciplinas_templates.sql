-- ============================================
-- MIGRATION: Add Disciplinas Templates System
-- Purpose: Create tables for discipline templates organized by class
--          with automatic synchronization to linked turmas
-- Date: 2026-01-16
-- ============================================

-- ============================================
-- TABLE: disciplinas_template
-- Catalogue of disciplines per class (7ª, 8ª, etc.)
-- ============================================

CREATE TABLE IF NOT EXISTS disciplinas_template (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    classe TEXT NOT NULL,                    -- '1ª Classe', '7ª Classe', '12ª Classe', etc.
    nome TEXT NOT NULL,                      -- 'Matemática', 'Língua Portuguesa'
    codigo_disciplina TEXT NOT NULL,
    carga_horaria INTEGER,
    descricao TEXT,
    ordem INTEGER DEFAULT 1,                 -- Display order in reports
    is_obrigatoria BOOLEAN DEFAULT false,    -- Mandatory discipline for transition rules
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_template_escola_classe_codigo UNIQUE (escola_id, classe, codigo_disciplina)
);

-- Add comments for documentation
COMMENT ON TABLE disciplinas_template IS 'Catalogue of discipline templates per class for each school';
COMMENT ON COLUMN disciplinas_template.classe IS 'Class name: 1ª Classe, 7ª Classe, etc.';
COMMENT ON COLUMN disciplinas_template.is_obrigatoria IS 'If true, this discipline is mandatory for transition rules (like LP and Matemática)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_disciplinas_template_escola ON disciplinas_template(escola_id);
CREATE INDEX IF NOT EXISTS idx_disciplinas_template_classe ON disciplinas_template(classe);
CREATE INDEX IF NOT EXISTS idx_disciplinas_template_escola_classe ON disciplinas_template(escola_id, classe);

-- Enable RLS
ALTER TABLE disciplinas_template ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger
CREATE TRIGGER update_disciplinas_template_updated_at 
    BEFORE UPDATE ON disciplinas_template
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add audit trigger
CREATE TRIGGER audit_disciplinas_template 
    AFTER INSERT OR UPDATE OR DELETE ON disciplinas_template
    FOR EACH ROW 
    EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- TABLE: componentes_template
-- Standard evaluation components for each discipline template
-- ============================================

CREATE TABLE IF NOT EXISTS componentes_template (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disciplina_template_id UUID NOT NULL REFERENCES disciplinas_template(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    codigo_componente TEXT NOT NULL,
    peso_percentual NUMERIC(5,2) NOT NULL CHECK (peso_percentual > 0 AND peso_percentual <= 100),
    escala_minima NUMERIC(5,2) NOT NULL DEFAULT 0,
    escala_maxima NUMERIC(5,2) NOT NULL DEFAULT 20,
    obrigatorio BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 1,
    descricao TEXT,
    trimestre INTEGER DEFAULT 1 CHECK (trimestre IN (1, 2, 3)),
    is_calculated BOOLEAN DEFAULT false,
    formula_expression TEXT,
    depends_on_components JSONB DEFAULT '[]'::jsonb,
    tipo_calculo TEXT DEFAULT 'trimestral' CHECK (tipo_calculo IN ('trimestral', 'anual')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_componente_template UNIQUE (disciplina_template_id, codigo_componente, trimestre)
);

-- Add comments for documentation
COMMENT ON TABLE componentes_template IS 'Standard evaluation components for discipline templates';
COMMENT ON COLUMN componentes_template.peso_percentual IS 'Weight percentage of this component (sum should be 100% per discipline per trimestre)';
COMMENT ON COLUMN componentes_template.is_calculated IS 'If true, this component is auto-calculated using formula_expression';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_componentes_template_disciplina ON componentes_template(disciplina_template_id);
CREATE INDEX IF NOT EXISTS idx_componentes_template_trimestre ON componentes_template(trimestre);

-- Enable RLS
ALTER TABLE componentes_template ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger
CREATE TRIGGER update_componentes_template_updated_at 
    BEFORE UPDATE ON componentes_template
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add audit trigger
CREATE TRIGGER audit_componentes_template 
    AFTER INSERT OR UPDATE OR DELETE ON componentes_template
    FOR EACH ROW 
    EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- TABLE: turma_template_link
-- Links between turmas and applied templates
-- ============================================

CREATE TABLE IF NOT EXISTS turma_template_link (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
    disciplina_template_id UUID NOT NULL REFERENCES disciplinas_template(id) ON DELETE CASCADE,
    disciplina_id UUID NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
    sincronizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_turma_template UNIQUE (turma_id, disciplina_template_id),
    CONSTRAINT unique_turma_disciplina_link UNIQUE (turma_id, disciplina_id)
);

-- Add comments for documentation
COMMENT ON TABLE turma_template_link IS 'Links between turmas and applied discipline templates for synchronization';
COMMENT ON COLUMN turma_template_link.sincronizado_em IS 'Last time this link was synchronized with the template';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_turma_template_link_turma ON turma_template_link(turma_id);
CREATE INDEX IF NOT EXISTS idx_turma_template_link_template ON turma_template_link(disciplina_template_id);
CREATE INDEX IF NOT EXISTS idx_turma_template_link_disciplina ON turma_template_link(disciplina_id);

-- Enable RLS
ALTER TABLE turma_template_link ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- disciplinas_template: School can manage their templates
CREATE POLICY "escola_view_own_templates"
    ON disciplinas_template FOR SELECT
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
        )
    );

CREATE POLICY "escola_insert_templates"
    ON disciplinas_template FOR INSERT
    WITH CHECK (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
        )
    );

CREATE POLICY "escola_update_templates"
    ON disciplinas_template FOR UPDATE
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
        )
    );

CREATE POLICY "escola_delete_templates"
    ON disciplinas_template FOR DELETE
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
        )
    );

-- componentes_template: Based on parent template
CREATE POLICY "escola_view_componentes_template"
    ON componentes_template FOR SELECT
    USING (
        disciplina_template_id IN (
            SELECT id FROM disciplinas_template 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );

CREATE POLICY "escola_insert_componentes_template"
    ON componentes_template FOR INSERT
    WITH CHECK (
        disciplina_template_id IN (
            SELECT id FROM disciplinas_template 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );

CREATE POLICY "escola_update_componentes_template"
    ON componentes_template FOR UPDATE
    USING (
        disciplina_template_id IN (
            SELECT id FROM disciplinas_template 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );

CREATE POLICY "escola_delete_componentes_template"
    ON componentes_template FOR DELETE
    USING (
        disciplina_template_id IN (
            SELECT id FROM disciplinas_template 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );

-- turma_template_link: Based on turma ownership
CREATE POLICY "escola_view_template_links"
    ON turma_template_link FOR SELECT
    USING (
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );

CREATE POLICY "escola_insert_template_links"
    ON turma_template_link FOR INSERT
    WITH CHECK (
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );

CREATE POLICY "escola_delete_template_links"
    ON turma_template_link FOR DELETE
    USING (
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON disciplinas_template TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON componentes_template TO authenticated;
GRANT SELECT, INSERT, DELETE ON turma_template_link TO authenticated;
