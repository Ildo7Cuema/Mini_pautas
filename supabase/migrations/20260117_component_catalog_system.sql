-- ============================================
-- MIGRATION: Component Catalog System
-- Purpose: Create a centralized catalog of evaluation components
--          to eliminate data duplication across disciplines
-- Date: 2026-01-17
-- ============================================

-- ============================================
-- TABLE: componentes_catalogo
-- Central catalog of evaluation components per school
-- Each component is defined once and reused across disciplines
-- ============================================

CREATE TABLE IF NOT EXISTS componentes_catalogo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    codigo_componente TEXT NOT NULL,
    nome TEXT NOT NULL,
    peso_padrao NUMERIC(5,2) DEFAULT 100 CHECK (peso_padrao > 0 AND peso_padrao <= 100),
    escala_minima NUMERIC(5,2) NOT NULL DEFAULT 0,
    escala_maxima NUMERIC(5,2) NOT NULL DEFAULT 20,
    is_calculated BOOLEAN DEFAULT false,
    formula_expression TEXT,
    depends_on_codes TEXT[] DEFAULT '{}', -- Component codes this depends on
    tipo_calculo TEXT DEFAULT 'trimestral' CHECK (tipo_calculo IN ('trimestral', 'anual')),
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_escala_catalogo CHECK (escala_minima < escala_maxima),
    CONSTRAINT unique_componente_escola UNIQUE (escola_id, codigo_componente)
);

-- Add comments for documentation
COMMENT ON TABLE componentes_catalogo IS 'Central catalog of evaluation components per school - each component is defined once';
COMMENT ON COLUMN componentes_catalogo.codigo_componente IS 'Unique code within the school: MAC, PP, PT, MT, MF, etc.';
COMMENT ON COLUMN componentes_catalogo.peso_padrao IS 'Default weight percentage when associating with a discipline';
COMMENT ON COLUMN componentes_catalogo.depends_on_codes IS 'Array of component codes this calculated component depends on';
COMMENT ON COLUMN componentes_catalogo.tipo_calculo IS 'Calculation type: trimestral (within trimester) or anual (across trimesters)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_componentes_catalogo_escola ON componentes_catalogo(escola_id);
CREATE INDEX IF NOT EXISTS idx_componentes_catalogo_codigo ON componentes_catalogo(codigo_componente);
CREATE INDEX IF NOT EXISTS idx_componentes_catalogo_escola_ativo ON componentes_catalogo(escola_id, ativo);
CREATE INDEX IF NOT EXISTS idx_componentes_catalogo_calculated ON componentes_catalogo(is_calculated) WHERE is_calculated = true;

-- Enable RLS
ALTER TABLE componentes_catalogo ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger
CREATE TRIGGER update_componentes_catalogo_updated_at 
    BEFORE UPDATE ON componentes_catalogo
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add audit trigger
CREATE TRIGGER audit_componentes_catalogo 
    AFTER INSERT OR UPDATE OR DELETE ON componentes_catalogo
    FOR EACH ROW 
    EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- TABLE: disciplina_componentes
-- Association between disciplines and catalog components
-- Allows the same component to be used in multiple disciplines
-- ============================================

CREATE TABLE IF NOT EXISTS disciplina_componentes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disciplina_id UUID NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
    componente_catalogo_id UUID NOT NULL REFERENCES componentes_catalogo(id) ON DELETE RESTRICT,
    trimestre INTEGER NOT NULL CHECK (trimestre IN (1, 2, 3)),
    peso_percentual NUMERIC(5,2) NOT NULL CHECK (peso_percentual > 0 AND peso_percentual <= 100),
    ordem INTEGER DEFAULT 1,
    obrigatorio BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_disciplina_componente_trimestre UNIQUE (disciplina_id, componente_catalogo_id, trimestre)
);

-- Add comments for documentation
COMMENT ON TABLE disciplina_componentes IS 'Association between disciplines and catalog components - allows reuse';
COMMENT ON COLUMN disciplina_componentes.peso_percentual IS 'Weight percentage for this component in this specific discipline (may differ from default)';
COMMENT ON COLUMN disciplina_componentes.trimestre IS 'Trimester: 1, 2, or 3';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_disciplina_componentes_disciplina ON disciplina_componentes(disciplina_id);
CREATE INDEX IF NOT EXISTS idx_disciplina_componentes_componente ON disciplina_componentes(componente_catalogo_id);
CREATE INDEX IF NOT EXISTS idx_disciplina_componentes_trimestre ON disciplina_componentes(trimestre);
CREATE INDEX IF NOT EXISTS idx_disciplina_componentes_disciplina_trimestre ON disciplina_componentes(disciplina_id, trimestre);

-- Enable RLS
ALTER TABLE disciplina_componentes ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger
CREATE TRIGGER update_disciplina_componentes_updated_at 
    BEFORE UPDATE ON disciplina_componentes
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add audit trigger
CREATE TRIGGER audit_disciplina_componentes 
    AFTER INSERT OR UPDATE OR DELETE ON disciplina_componentes
    FOR EACH ROW 
    EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- RLS POLICIES FOR componentes_catalogo
-- ============================================

-- Schools can view their own catalog
CREATE POLICY "escola_view_componentes_catalogo"
    ON componentes_catalogo FOR SELECT
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
        )
    );

-- Professors can view components from their school
CREATE POLICY "professor_view_componentes_catalogo"
    ON componentes_catalogo FOR SELECT
    USING (
        escola_id IN (
            SELECT escola_id FROM professores 
            WHERE user_id = auth.uid()
        )
    );

-- Schools can manage their catalog
CREATE POLICY "escola_insert_componentes_catalogo"
    ON componentes_catalogo FOR INSERT
    WITH CHECK (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
        )
    );

CREATE POLICY "escola_update_componentes_catalogo"
    ON componentes_catalogo FOR UPDATE
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
        )
    );

CREATE POLICY "escola_delete_componentes_catalogo"
    ON componentes_catalogo FOR DELETE
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
        )
    );

-- ============================================
-- RLS POLICIES FOR disciplina_componentes
-- ============================================

-- Professors can view associations for their disciplines
CREATE POLICY "professor_view_disciplina_componentes"
    ON disciplina_componentes FOR SELECT
    USING (
        disciplina_id IN (
            SELECT id FROM disciplinas 
            WHERE professor_id IN (
                SELECT id FROM professores WHERE user_id = auth.uid()
            )
        )
    );

-- Schools can view all associations
CREATE POLICY "escola_view_disciplina_componentes"
    ON disciplina_componentes FOR SELECT
    USING (
        disciplina_id IN (
            SELECT d.id FROM disciplinas d
            JOIN turmas t ON d.turma_id = t.id
            WHERE t.escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );

-- Professors can manage associations for their disciplines
CREATE POLICY "professor_insert_disciplina_componentes"
    ON disciplina_componentes FOR INSERT
    WITH CHECK (
        disciplina_id IN (
            SELECT id FROM disciplinas 
            WHERE professor_id IN (
                SELECT id FROM professores WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "professor_update_disciplina_componentes"
    ON disciplina_componentes FOR UPDATE
    USING (
        disciplina_id IN (
            SELECT id FROM disciplinas 
            WHERE professor_id IN (
                SELECT id FROM professores WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "professor_delete_disciplina_componentes"
    ON disciplina_componentes FOR DELETE
    USING (
        disciplina_id IN (
            SELECT id FROM disciplinas 
            WHERE professor_id IN (
                SELECT id FROM professores WHERE user_id = auth.uid()
            )
        )
    );

-- Schools can manage all associations
CREATE POLICY "escola_manage_disciplina_componentes"
    ON disciplina_componentes FOR ALL
    USING (
        disciplina_id IN (
            SELECT d.id FROM disciplinas d
            JOIN turmas t ON d.turma_id = t.id
            WHERE t.escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON componentes_catalogo TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON disciplina_componentes TO authenticated;
