-- ============================================
-- ESTATÍSTICAS DE TUTORIAIS - EduGest Angola
-- Adiciona contadores de visualizações e likes
-- Data: 2024-12-31
-- ============================================

-- Adicionar colunas de estatísticas à tabela tutoriais
ALTER TABLE tutoriais 
ADD COLUMN IF NOT EXISTS visualizacoes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;

-- Comentários para documentação
COMMENT ON COLUMN tutoriais.visualizacoes IS 'Número total de visualizações do tutorial';
COMMENT ON COLUMN tutoriais.likes IS 'Número total de likes no tutorial';

-- ============================================
-- TABELA DE LIKES DOS TUTORIAIS
-- Controla quem deu like para evitar duplicatas
-- ============================================

CREATE TABLE IF NOT EXISTS tutorial_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tutorial_id UUID NOT NULL REFERENCES tutoriais(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT, -- Para usuários não autenticados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_tutorial_user_like UNIQUE (tutorial_id, user_id),
    CONSTRAINT unique_tutorial_session_like UNIQUE (tutorial_id, session_id)
);

COMMENT ON TABLE tutorial_likes IS 'Registro de likes dos tutoriais por usuário ou sessão';

-- ============================================
-- TABELA DE VISUALIZAÇÕES DOS TUTORIAIS
-- Controla visualizações únicas
-- ============================================

CREATE TABLE IF NOT EXISTS tutorial_visualizacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tutorial_id UUID NOT NULL REFERENCES tutoriais(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT, -- Para usuários não autenticados
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE tutorial_visualizacoes IS 'Registro de visualizações dos tutoriais';

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tutorial_likes_tutorial ON tutorial_likes(tutorial_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_likes_user ON tutorial_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_visualizacoes_tutorial ON tutorial_visualizacoes(tutorial_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_visualizacoes_user ON tutorial_visualizacoes(user_id);

-- ============================================
-- FUNÇÃO PARA INCREMENTAR VISUALIZAÇÃO
-- ============================================

CREATE OR REPLACE FUNCTION incrementar_visualizacao_tutorial(
    p_tutorial_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Inserir registro de visualização
    INSERT INTO tutorial_visualizacoes (tutorial_id, user_id, session_id)
    VALUES (p_tutorial_id, p_user_id, p_session_id);
    
    -- Incrementar contador na tabela principal
    UPDATE tutoriais 
    SET visualizacoes = visualizacoes + 1
    WHERE id = p_tutorial_id
    RETURNING visualizacoes INTO v_count;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNÇÃO PARA TOGGLE LIKE
-- ============================================

CREATE OR REPLACE FUNCTION toggle_like_tutorial(
    p_tutorial_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL
)
RETURNS TABLE(liked BOOLEAN, total_likes INTEGER) AS $$
DECLARE
    v_liked BOOLEAN;
    v_count INTEGER;
BEGIN
    -- Verificar se já existe like
    IF p_user_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM tutorial_likes WHERE tutorial_id = p_tutorial_id AND user_id = p_user_id) THEN
            -- Remover like
            DELETE FROM tutorial_likes WHERE tutorial_id = p_tutorial_id AND user_id = p_user_id;
            UPDATE tutoriais SET likes = likes - 1 WHERE id = p_tutorial_id RETURNING likes INTO v_count;
            v_liked := FALSE;
        ELSE
            -- Adicionar like
            INSERT INTO tutorial_likes (tutorial_id, user_id) VALUES (p_tutorial_id, p_user_id);
            UPDATE tutoriais SET likes = likes + 1 WHERE id = p_tutorial_id RETURNING likes INTO v_count;
            v_liked := TRUE;
        END IF;
    ELSE
        IF EXISTS (SELECT 1 FROM tutorial_likes WHERE tutorial_id = p_tutorial_id AND session_id = p_session_id) THEN
            -- Remover like
            DELETE FROM tutorial_likes WHERE tutorial_id = p_tutorial_id AND session_id = p_session_id;
            UPDATE tutoriais SET likes = likes - 1 WHERE id = p_tutorial_id RETURNING likes INTO v_count;
            v_liked := FALSE;
        ELSE
            -- Adicionar like
            INSERT INTO tutorial_likes (tutorial_id, session_id) VALUES (p_tutorial_id, p_session_id);
            UPDATE tutoriais SET likes = likes + 1 WHERE id = p_tutorial_id RETURNING likes INTO v_count;
            v_liked := TRUE;
        END IF;
    END IF;
    
    RETURN QUERY SELECT v_liked, v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

ALTER TABLE tutorial_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutorial_visualizacoes ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode ler likes (para exibir contadores)
CREATE POLICY "Leitura publica de tutorial_likes"
    ON tutorial_likes FOR SELECT
    TO anon, authenticated
    USING (true);

-- Qualquer pessoa pode inserir likes
CREATE POLICY "Qualquer pessoa pode dar like"
    ON tutorial_likes FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Usuários podem remover seus próprios likes
CREATE POLICY "Usuarios podem remover seus likes"
    ON tutorial_likes FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Visualizações - leitura pública
CREATE POLICY "Leitura publica de tutorial_visualizacoes"
    ON tutorial_visualizacoes FOR SELECT
    TO anon, authenticated
    USING (true);

-- Qualquer pessoa pode registrar visualização
CREATE POLICY "Qualquer pessoa pode registrar visualizacao"
    ON tutorial_visualizacoes FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, DELETE ON tutorial_likes TO anon, authenticated;
GRANT SELECT, INSERT ON tutorial_visualizacoes TO anon, authenticated;
GRANT EXECUTE ON FUNCTION incrementar_visualizacao_tutorial TO anon, authenticated;
GRANT EXECUTE ON FUNCTION toggle_like_tutorial TO anon, authenticated;

-- ============================================
-- END OF MIGRATION
-- ============================================
