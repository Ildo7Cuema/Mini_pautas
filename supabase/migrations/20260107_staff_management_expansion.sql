-- ============================================
-- MIGRATION: Comprehensive Staff Management System
-- Purpose: Expand staff categories and add detailed teacher classifications
-- Date: 2026-01-07
-- Module: municipal_education_module (isolated, reversible)
-- ============================================

-- ============================================
-- PHASE 1: Expand professores table with academic qualifications
-- ============================================

-- Add grau_academico (academic degree)
ALTER TABLE professores ADD COLUMN IF NOT EXISTS grau_academico TEXT 
    CHECK (grau_academico IS NULL OR grau_academico IN (
        'DOUTORADO',      -- PhD
        'MESTRADO',       -- Master's
        'LICENCIATURA',   -- Bachelor's (Licensed)
        'BACHARELATO',    -- Bachelor's (3-year)
        'TECNICO_MEDIO',  -- Technical Medium
        'TECNICO_BASICO', -- Basic Technical
        'SEM_FORMACAO'    -- No higher education
    ));

-- Add area_formacao (field of study)
ALTER TABLE professores ADD COLUMN IF NOT EXISTS area_formacao TEXT;

-- Add categoria_docente (teaching category)
ALTER TABLE professores ADD COLUMN IF NOT EXISTS categoria_docente TEXT
    CHECK (categoria_docente IS NULL OR categoria_docente IN (
        'PROFESSOR_TITULAR',     -- Full professor
        'PROFESSOR_AUXILIAR',    -- Assistant professor
        'PROFESSOR_ESTAGIARIO',  -- Trainee teacher
        'PROFESSOR_CONTRATADO',  -- Contracted teacher
        'MONITOR'                -- Teaching assistant
    ));

-- Add instituicao_formacao (training institution)
ALTER TABLE professores ADD COLUMN IF NOT EXISTS instituicao_formacao TEXT;

-- Add ano_conclusao (graduation year)
ALTER TABLE professores ADD COLUMN IF NOT EXISTS ano_conclusao INTEGER;

-- Add numero_diploma (diploma number)
ALTER TABLE professores ADD COLUMN IF NOT EXISTS numero_diploma TEXT;

-- Create index for filtering by grau_academico
CREATE INDEX IF NOT EXISTS idx_professores_grau_academico ON professores(grau_academico);
CREATE INDEX IF NOT EXISTS idx_professores_area_formacao ON professores(area_formacao);
CREATE INDEX IF NOT EXISTS idx_professores_categoria_docente ON professores(categoria_docente);

-- ============================================
-- PHASE 2: Create funcionarios_escola table for non-teaching staff
-- ============================================

CREATE TABLE IF NOT EXISTS funcionarios_escola (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    nome_completo TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    numero_funcionario TEXT,
    -- Main category
    categoria TEXT NOT NULL CHECK (categoria IN (
        'DIRECAO',       -- Direction (Directors)
        'COORDENACAO',   -- Coordination
        'ADMINISTRATIVO', -- Administrative staff
        'APOIO'          -- Support staff
    )),
    -- Specific subcategory/position
    subcategoria TEXT NOT NULL,
    -- Additional details
    cargo TEXT, -- Specific job title if different from subcategoria
    departamento TEXT, -- Department/area
    data_admissao DATE,
    data_saida DATE,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_funcionarios_escola_escola ON funcionarios_escola(escola_id);
CREATE INDEX IF NOT EXISTS idx_funcionarios_escola_categoria ON funcionarios_escola(categoria);
CREATE INDEX IF NOT EXISTS idx_funcionarios_escola_subcategoria ON funcionarios_escola(subcategoria);
CREATE INDEX IF NOT EXISTS idx_funcionarios_escola_ativo ON funcionarios_escola(ativo);
CREATE INDEX IF NOT EXISTS idx_funcionarios_escola_user ON funcionarios_escola(user_id);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_funcionarios_escola_updated_at ON funcionarios_escola;
CREATE TRIGGER update_funcionarios_escola_updated_at 
    BEFORE UPDATE ON funcionarios_escola
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE funcionarios_escola ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PHASE 3: Create cargos_coordenacao table (coordination roles for teachers)
-- ============================================

CREATE TABLE IF NOT EXISTS cargos_coordenacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    professor_id UUID NOT NULL REFERENCES professores(id) ON DELETE CASCADE,
    tipo_cargo TEXT NOT NULL CHECK (tipo_cargo IN (
        'DIRECTOR_GERAL',
        'DIRECTOR_PEDAGOGICO',
        'DIRECTOR_ADMINISTRATIVO',
        'COORDENADOR_CLASSE',
        'COORDENADOR_DISCIPLINA',
        'COORDENADOR_PEDAGOGICO',
        'COORDENADOR_TURNO'
    )),
    -- For class/subject coordinators
    turma_id UUID REFERENCES turmas(id) ON DELETE SET NULL,
    disciplina_nome TEXT, -- For subject coordinators
    -- Period
    ano_lectivo TEXT,
    data_inicio DATE,
    data_fim DATE,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cargos_coordenacao_escola ON cargos_coordenacao(escola_id);
CREATE INDEX IF NOT EXISTS idx_cargos_coordenacao_professor ON cargos_coordenacao(professor_id);
CREATE INDEX IF NOT EXISTS idx_cargos_coordenacao_tipo ON cargos_coordenacao(tipo_cargo);
CREATE INDEX IF NOT EXISTS idx_cargos_coordenacao_ativo ON cargos_coordenacao(ativo);

-- Trigger
DROP TRIGGER IF EXISTS update_cargos_coordenacao_updated_at ON cargos_coordenacao;
CREATE TRIGGER update_cargos_coordenacao_updated_at 
    BEFORE UPDATE ON cargos_coordenacao
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE cargos_coordenacao ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PHASE 4: Create areas_formacao lookup table
-- ============================================

CREATE TABLE IF NOT EXISTS areas_formacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL UNIQUE,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed common formation areas
INSERT INTO areas_formacao (nome, descricao) VALUES
    ('Matemática', 'Licenciatura em Matemática'),
    ('Física', 'Licenciatura em Física'),
    ('Química', 'Licenciatura em Química'),
    ('Biologia', 'Licenciatura em Biologia'),
    ('Língua Portuguesa', 'Licenciatura em Língua Portuguesa'),
    ('História', 'Licenciatura em História'),
    ('Geografia', 'Licenciatura em Geografia'),
    ('Educação Física', 'Licenciatura em Educação Física'),
    ('Artes', 'Licenciatura em Educação Artística'),
    ('Informática', 'Licenciatura em Informática/Computação'),
    ('Inglês', 'Licenciatura em Língua Inglesa'),
    ('Francês', 'Licenciatura em Língua Francesa'),
    ('Pedagogia', 'Licenciatura em Pedagogia'),
    ('Psicologia', 'Licenciatura em Psicologia'),
    ('Filosofia', 'Licenciatura em Filosofia'),
    ('Educação Moral e Cívica', 'Formação em EMC'),
    ('Economia', 'Licenciatura em Economia'),
    ('Direito', 'Licenciatura em Direito'),
    ('Administração', 'Licenciatura em Administração'),
    ('Contabilidade', 'Licenciatura em Contabilidade'),
    ('Engenharia', 'Engenharia (diversas áreas)'),
    ('Medicina', 'Medicina e áreas da saúde'),
    ('Enfermagem', 'Licenciatura em Enfermagem'),
    ('Agronomia', 'Licenciatura em Agronomia'),
    ('Outra', 'Outra área de formação')
ON CONFLICT (nome) DO NOTHING;

-- ============================================
-- PHASE 5: RLS Policies for new tables
-- ============================================

-- funcionarios_escola policies

-- Schools can manage their own staff
DROP POLICY IF EXISTS "Schools can view funcionarios" ON funcionarios_escola;
CREATE POLICY "Schools can view funcionarios"
    ON funcionarios_escola FOR SELECT
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA' AND ativo = true
        )
    );

DROP POLICY IF EXISTS "Schools can insert funcionarios" ON funcionarios_escola;
CREATE POLICY "Schools can insert funcionarios"
    ON funcionarios_escola FOR INSERT
    WITH CHECK (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA' AND ativo = true
        )
    );

DROP POLICY IF EXISTS "Schools can update funcionarios" ON funcionarios_escola;
CREATE POLICY "Schools can update funcionarios"
    ON funcionarios_escola FOR UPDATE
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA' AND ativo = true
        )
    );

DROP POLICY IF EXISTS "Schools can delete funcionarios" ON funcionarios_escola;
CREATE POLICY "Schools can delete funcionarios"
    ON funcionarios_escola FOR DELETE
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA' AND ativo = true
        )
    );

-- SUPERADMIN full access
DROP POLICY IF EXISTS "SUPERADMIN can manage funcionarios" ON funcionarios_escola;
CREATE POLICY "SUPERADMIN can manage funcionarios"
    ON funcionarios_escola FOR ALL
    USING (is_superadmin());

-- Direção Municipal can view (read-only) - uses helper functions
DROP POLICY IF EXISTS "DirecaoMunicipal can view funcionarios" ON funcionarios_escola;
CREATE POLICY "DirecaoMunicipal can view funcionarios"
    ON funcionarios_escola FOR SELECT
    USING (
        is_direcao_municipal() AND
        escola_id IN (
            SELECT id FROM escolas WHERE municipio = get_direcao_municipio()
        )
    );

-- cargos_coordenacao policies

DROP POLICY IF EXISTS "Schools can manage cargos" ON cargos_coordenacao;
CREATE POLICY "Schools can manage cargos"
    ON cargos_coordenacao FOR ALL
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA' AND ativo = true
        )
    );

DROP POLICY IF EXISTS "SUPERADMIN can manage cargos" ON cargos_coordenacao;
CREATE POLICY "SUPERADMIN can manage cargos"
    ON cargos_coordenacao FOR ALL
    USING (is_superadmin());

DROP POLICY IF EXISTS "DirecaoMunicipal can view cargos" ON cargos_coordenacao;
CREATE POLICY "DirecaoMunicipal can view cargos"
    ON cargos_coordenacao FOR SELECT
    USING (
        is_direcao_municipal() AND
        escola_id IN (
            SELECT id FROM escolas WHERE municipio = get_direcao_municipio()
        )
    );

-- areas_formacao - public read
ALTER TABLE areas_formacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view areas_formacao" ON areas_formacao;
CREATE POLICY "Anyone can view areas_formacao"
    ON areas_formacao FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "SUPERADMIN can manage areas_formacao" ON areas_formacao;
CREATE POLICY "SUPERADMIN can manage areas_formacao"
    ON areas_formacao FOR ALL
    USING (is_superadmin());

-- ============================================
-- PHASE 6: Grant permissions
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON funcionarios_escola TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cargos_coordenacao TO authenticated;
GRANT SELECT ON areas_formacao TO authenticated;

-- ============================================
-- PHASE 7: Documentation comments
-- ============================================

COMMENT ON TABLE funcionarios_escola IS 'Non-teaching school staff (directors, admin, support)';
COMMENT ON TABLE cargos_coordenacao IS 'Coordination roles assigned to teachers';
COMMENT ON TABLE areas_formacao IS 'Lookup table for teacher formation areas';

COMMENT ON COLUMN professores.grau_academico IS 'Academic degree: DOUTORADO, MESTRADO, LICENCIATURA, BACHARELATO, TECNICO_MEDIO, TECNICO_BASICO, SEM_FORMACAO';
COMMENT ON COLUMN professores.area_formacao IS 'Field of study/specialization';
COMMENT ON COLUMN professores.categoria_docente IS 'Teaching category: PROFESSOR_TITULAR, PROFESSOR_AUXILIAR, PROFESSOR_ESTAGIARIO, PROFESSOR_CONTRATADO, MONITOR';

-- ============================================
-- END OF MIGRATION
-- ============================================
