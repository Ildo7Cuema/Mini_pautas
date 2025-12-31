-- ============================================
-- SISTEMA DE TUTORIAIS - EduGest Angola
-- Migração SQL para criar tabelas de tutoriais
-- Data: 2024-12-31
-- ============================================

-- ============================================
-- TABELA DE TUTORIAIS
-- ============================================

CREATE TABLE tutoriais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo TEXT NOT NULL,
    descricao TEXT,
    url_video TEXT NOT NULL,
    thumbnail_url TEXT,
    categoria TEXT NOT NULL DEFAULT 'geral',
    ordem INTEGER DEFAULT 0,
    publico BOOLEAN DEFAULT false,
    ativo BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment for documentation
COMMENT ON TABLE tutoriais IS 'Tabela de vídeos tutoriais do sistema';
COMMENT ON COLUMN tutoriais.publico IS 'Se true, o tutorial é visível sem login';
COMMENT ON COLUMN tutoriais.categoria IS 'Categoria: geral, login, turmas, notas, relatorios, configuracoes';

-- ============================================
-- TABELA DE PERFIS POR TUTORIAL
-- ============================================

CREATE TABLE tutorial_perfis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tutorial_id UUID NOT NULL REFERENCES tutoriais(id) ON DELETE CASCADE,
    perfil TEXT NOT NULL CHECK (perfil IN ('ESCOLA', 'PROFESSOR', 'SECRETARIO', 'ALUNO', 'ENCARREGADO')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_tutorial_perfil UNIQUE (tutorial_id, perfil)
);

COMMENT ON TABLE tutorial_perfis IS 'Associação de tutoriais com perfis de usuário';

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_tutoriais_categoria ON tutoriais(categoria);
CREATE INDEX idx_tutoriais_publico ON tutoriais(publico);
CREATE INDEX idx_tutoriais_ativo ON tutoriais(ativo);
CREATE INDEX idx_tutoriais_ordem ON tutoriais(ordem);
CREATE INDEX idx_tutorial_perfis_tutorial ON tutorial_perfis(tutorial_id);
CREATE INDEX idx_tutorial_perfis_perfil ON tutorial_perfis(perfil);

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================

CREATE TRIGGER update_tutoriais_updated_at BEFORE UPDATE ON tutoriais
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

ALTER TABLE tutoriais ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutorial_perfis ENABLE ROW LEVEL SECURITY;

-- Policy: Tutoriais públicos podem ser lidos por qualquer pessoa (anon)
CREATE POLICY "Tutoriais publicos sao visiveis para todos"
    ON tutoriais FOR SELECT
    TO anon, authenticated
    USING (publico = true AND ativo = true);

-- Policy: Usuários autenticados podem ver tutoriais do seu perfil
CREATE POLICY "Usuarios veem tutoriais do seu perfil"
    ON tutoriais FOR SELECT
    TO authenticated
    USING (
        ativo = true AND (
            publico = true OR
            id IN (
                SELECT tp.tutorial_id 
                FROM tutorial_perfis tp
                JOIN user_profiles up ON up.user_id = auth.uid()
                WHERE tp.perfil = up.tipo_perfil
            )
        )
    );

-- Policy: SUPERADMIN pode ver todos os tutoriais
CREATE POLICY "Superadmin ve todos os tutoriais"
    ON tutoriais FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid() AND tipo_perfil = 'SUPERADMIN'
        )
    );

-- Policy: SUPERADMIN pode criar tutoriais
CREATE POLICY "Superadmin pode criar tutoriais"
    ON tutoriais FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid() AND tipo_perfil = 'SUPERADMIN'
        )
    );

-- Policy: SUPERADMIN pode atualizar tutoriais
CREATE POLICY "Superadmin pode atualizar tutoriais"
    ON tutoriais FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid() AND tipo_perfil = 'SUPERADMIN'
        )
    );

-- Policy: SUPERADMIN pode deletar tutoriais
CREATE POLICY "Superadmin pode deletar tutoriais"
    ON tutoriais FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid() AND tipo_perfil = 'SUPERADMIN'
        )
    );

-- ============================================
-- TUTORIAL_PERFIS RLS POLICIES
-- ============================================

-- Policy: Qualquer pessoa pode ler tutorial_perfis (para verificar acesso)
CREATE POLICY "Leitura publica de tutorial_perfis"
    ON tutorial_perfis FOR SELECT
    TO anon, authenticated
    USING (true);

-- Policy: SUPERADMIN pode gerenciar tutorial_perfis
CREATE POLICY "Superadmin gerencia tutorial_perfis"
    ON tutorial_perfis FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid() AND tipo_perfil = 'SUPERADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid() AND tipo_perfil = 'SUPERADMIN'
        )
    );

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT SELECT ON tutoriais TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON tutoriais TO authenticated;
GRANT SELECT ON tutorial_perfis TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON tutorial_perfis TO authenticated;

-- ============================================
-- SEED DATA (Optional - Some example tutorials)
-- ============================================

-- Uncomment to add example tutorials
/*
INSERT INTO tutoriais (titulo, descricao, url_video, categoria, ordem, publico) VALUES
('Bem-vindo ao EduGest Angola', 'Introdução ao sistema de gestão de notas', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'geral', 1, true),
('Como Fazer Login', 'Tutorial sobre como acessar o sistema', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'login', 2, true),
('Cadastro de Escola', 'Como cadastrar sua escola no sistema', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'login', 3, true);
*/

-- ============================================
-- END OF MIGRATION
-- ============================================
