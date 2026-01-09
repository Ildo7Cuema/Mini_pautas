-- ============================================
-- MIGRATION: Add Direção Provincial System
-- Purpose: Add provincial education directorate role with municipal oversight
-- Date: 2026-01-09
-- ============================================

-- ============================================
-- PHASE 1: Create direcoes_provinciais table
-- ============================================

CREATE TABLE IF NOT EXISTS direcoes_provinciais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    provincia TEXT NOT NULL UNIQUE,  -- Only one directorate per province
    email TEXT NOT NULL UNIQUE,
    telefone TEXT,
    cargo TEXT DEFAULT 'Director Provincial de Educação',
    numero_funcionario TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_direcoes_provinciais_provincia ON direcoes_provinciais(provincia);
CREATE INDEX IF NOT EXISTS idx_direcoes_provinciais_user_id ON direcoes_provinciais(user_id);

-- Add updated_at trigger
CREATE TRIGGER update_direcoes_provinciais_updated_at 
    BEFORE UPDATE ON direcoes_provinciais
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add audit trigger
CREATE TRIGGER audit_direcoes_provinciais 
    AFTER INSERT OR UPDATE OR DELETE ON direcoes_provinciais
    FOR EACH ROW 
    EXECUTE FUNCTION audit_trigger_function();

-- Comments
COMMENT ON TABLE direcoes_provinciais IS 'Provincial Education Directorates - supervise all municipal directorates in their province';
COMMENT ON COLUMN direcoes_provinciais.provincia IS 'Province this directorate manages (UNIQUE - one directorate per province)';

-- ============================================
-- PHASE 2: Create historico_administrativo_direcoes_municipais table
-- ============================================

CREATE TABLE IF NOT EXISTS historico_administrativo_direcoes_municipais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    direcao_municipal_id UUID NOT NULL REFERENCES direcoes_municipais(id) ON DELETE CASCADE,
    estado_anterior TEXT,
    estado_novo TEXT NOT NULL,
    motivo TEXT,
    observacoes TEXT,
    alterado_por UUID REFERENCES auth.users(id),
    alterado_por_tipo TEXT CHECK (alterado_por_tipo IN ('DIRECAO_PROVINCIAL', 'SUPERADMIN')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_hist_direcoes_municipais_direcao ON historico_administrativo_direcoes_municipais(direcao_municipal_id);
CREATE INDEX IF NOT EXISTS idx_hist_direcoes_municipais_data ON historico_administrativo_direcoes_municipais(created_at DESC);

-- Comments
COMMENT ON TABLE historico_administrativo_direcoes_municipais IS 'Administrative history for municipal directorates (managed by Provincial/SUPERADMIN)';

-- ============================================
-- PHASE 3: Create circulares_provinciais table
-- ============================================

CREATE TABLE IF NOT EXISTS circulares_provinciais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_circular TEXT,
    titulo TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'circular' CHECK (tipo IN ('circular', 'aviso', 'comunicado', 'despacho')),
    provincia TEXT NOT NULL,
    urgente BOOLEAN DEFAULT false,
    publicado BOOLEAN DEFAULT false,
    data_publicacao TIMESTAMP WITH TIME ZONE,
    data_validade TIMESTAMP WITH TIME ZONE,
    anexo_url TEXT,
    anexo_filename TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_circulares_provinciais_provincia ON circulares_provinciais(provincia);
CREATE INDEX IF NOT EXISTS idx_circulares_provinciais_publicado ON circulares_provinciais(publicado, data_publicacao DESC);
CREATE INDEX IF NOT EXISTS idx_circulares_provinciais_tipo ON circulares_provinciais(tipo);
CREATE INDEX IF NOT EXISTS idx_circulares_provinciais_created_by ON circulares_provinciais(created_by);

-- Add updated_at trigger
CREATE TRIGGER update_circulares_provinciais_updated_at 
    BEFORE UPDATE ON circulares_provinciais
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add audit trigger
CREATE TRIGGER audit_circulares_provinciais 
    AFTER INSERT OR UPDATE OR DELETE ON circulares_provinciais
    FOR EACH ROW 
    EXECUTE FUNCTION audit_trigger_function();

-- Comments
COMMENT ON TABLE circulares_provinciais IS 'Provincial circulars - communications to all municipal directorates and schools in the province';

-- ============================================
-- PHASE 4: Create leituras_circulares_provinciais table
-- ============================================

CREATE TABLE IF NOT EXISTS leituras_circulares_provinciais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    circular_id UUID NOT NULL REFERENCES circulares_provinciais(id) ON DELETE CASCADE,
    direcao_municipal_id UUID REFERENCES direcoes_municipais(id) ON DELETE SET NULL,
    escola_id UUID REFERENCES escolas(id) ON DELETE SET NULL,
    lido_por UUID NOT NULL REFERENCES auth.users(id),
    lido_por_nome TEXT,
    lido_por_cargo TEXT,
    lido_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leituras_circ_prov_circular ON leituras_circulares_provinciais(circular_id);
CREATE INDEX IF NOT EXISTS idx_leituras_circ_prov_direcao ON leituras_circulares_provinciais(direcao_municipal_id);
CREATE INDEX IF NOT EXISTS idx_leituras_circ_prov_escola ON leituras_circulares_provinciais(escola_id);

-- Unique constraint: one read per entity per circular
CREATE UNIQUE INDEX IF NOT EXISTS idx_leituras_circ_prov_unique_direcao 
    ON leituras_circulares_provinciais(circular_id, direcao_municipal_id) 
    WHERE direcao_municipal_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_leituras_circ_prov_unique_escola 
    ON leituras_circulares_provinciais(circular_id, escola_id) 
    WHERE escola_id IS NOT NULL;

-- Comments
COMMENT ON TABLE leituras_circulares_provinciais IS 'Reading tracking for provincial circulars by municipal directorates and schools';

-- ============================================
-- PHASE 5: Update user_profiles constraints
-- ============================================

-- Drop existing constraints
ALTER TABLE user_profiles 
    DROP CONSTRAINT IF EXISTS user_profiles_tipo_perfil_check;

ALTER TABLE user_profiles 
    DROP CONSTRAINT IF EXISTS user_profiles_escola_check;

-- Add new tipo_perfil constraint with DIRECAO_PROVINCIAL
ALTER TABLE user_profiles 
    ADD CONSTRAINT user_profiles_tipo_perfil_check 
    CHECK (tipo_perfil IN ('ESCOLA', 'PROFESSOR', 'SUPERADMIN', 'ALUNO', 'ENCARREGADO', 'SECRETARIO', 'DIRECAO_MUNICIPAL', 'DIRECAO_PROVINCIAL'));

-- Add new escola_id constraint (null for SUPERADMIN, DIRECAO_MUNICIPAL and DIRECAO_PROVINCIAL)
ALTER TABLE user_profiles 
    ADD CONSTRAINT user_profiles_escola_check 
    CHECK (
        (tipo_perfil IN ('SUPERADMIN', 'DIRECAO_MUNICIPAL', 'DIRECAO_PROVINCIAL') AND escola_id IS NULL) OR 
        (tipo_perfil NOT IN ('SUPERADMIN', 'DIRECAO_MUNICIPAL', 'DIRECAO_PROVINCIAL') AND escola_id IS NOT NULL)
    );

-- ============================================
-- PHASE 6: Helper Functions for Direção Provincial
-- ============================================

-- Check if current user is Direção Provincial
CREATE OR REPLACE FUNCTION is_direcao_provincial()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND tipo_perfil = 'DIRECAO_PROVINCIAL' 
        AND ativo = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get the province of the current Direção Provincial user
CREATE OR REPLACE FUNCTION get_direcao_provincia()
RETURNS TEXT AS $$
DECLARE
    provincia_result TEXT;
BEGIN
    SELECT dp.provincia INTO provincia_result
    FROM direcoes_provinciais dp
    WHERE dp.user_id = auth.uid() 
    AND dp.ativo = true
    LIMIT 1;
    
    RETURN provincia_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if a school belongs to the current user's province
CREATE OR REPLACE FUNCTION escola_in_direcao_provincia(escola_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_provincia TEXT;
BEGIN
    user_provincia := get_direcao_provincia();
    
    IF user_provincia IS NULL THEN
        RETURN false;
    END IF;
    
    RETURN EXISTS (
        SELECT 1 FROM escolas e
        WHERE e.id = escola_uuid
        AND e.provincia = user_provincia
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if a municipal directorate belongs to the current user's province
CREATE OR REPLACE FUNCTION direcao_municipal_in_provincia(direcao_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_provincia TEXT;
BEGIN
    user_provincia := get_direcao_provincia();
    
    IF user_provincia IS NULL THEN
        RETURN false;
    END IF;
    
    RETURN EXISTS (
        SELECT 1 FROM direcoes_municipais dm
        WHERE dm.id = direcao_uuid
        AND dm.provincia = user_provincia
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to create Direção Provincial profile automatically
CREATE OR REPLACE FUNCTION create_direcao_provincial_profile()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS NOT NULL THEN
        INSERT INTO user_profiles (user_id, tipo_perfil, escola_id, ativo)
        VALUES (NEW.user_id, 'DIRECAO_PROVINCIAL', NULL, NEW.ativo)
        ON CONFLICT (user_id) DO UPDATE 
        SET tipo_perfil = 'DIRECAO_PROVINCIAL', ativo = NEW.ativo, escola_id = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile automatically
CREATE TRIGGER trigger_create_direcao_provincial_profile
    AFTER INSERT OR UPDATE OF user_id, ativo ON direcoes_provinciais
    FOR EACH ROW
    EXECUTE FUNCTION create_direcao_provincial_profile();

-- ============================================
-- PHASE 7: RLS Policies for direcoes_provinciais
-- ============================================

ALTER TABLE direcoes_provinciais ENABLE ROW LEVEL SECURITY;

-- Direção Provincial can view own profile
CREATE POLICY "Direcao Provincial can view own profile"
    ON direcoes_provinciais FOR SELECT
    USING (user_id = auth.uid());

-- Direção Provincial can update own profile
CREATE POLICY "Direcao Provincial can update own profile"
    ON direcoes_provinciais FOR UPDATE
    USING (user_id = auth.uid());

-- SUPERADMIN can manage all
CREATE POLICY "SUPERADMIN can manage all direcoes_provinciais"
    ON direcoes_provinciais FOR ALL
    USING (is_superadmin());

-- ============================================
-- PHASE 8: RLS Policies for historico_administrativo_direcoes_municipais
-- ============================================

ALTER TABLE historico_administrativo_direcoes_municipais ENABLE ROW LEVEL SECURITY;

-- Direção Provincial can view history for directorates in their province
CREATE POLICY "Direcao Provincial can view historico in provincia"
    ON historico_administrativo_direcoes_municipais FOR SELECT
    USING (
        is_direcao_provincial() AND 
        direcao_municipal_in_provincia(direcao_municipal_id)
    );

-- Direção Provincial can insert history for directorates in their province
CREATE POLICY "Direcao Provincial can insert historico in provincia"
    ON historico_administrativo_direcoes_municipais FOR INSERT
    WITH CHECK (
        is_direcao_provincial() AND 
        direcao_municipal_in_provincia(direcao_municipal_id)
    );

-- SUPERADMIN can manage all
CREATE POLICY "SUPERADMIN can manage historico_direcoes_municipais"
    ON historico_administrativo_direcoes_municipais FOR ALL
    USING (is_superadmin());

-- ============================================
-- PHASE 9: RLS Policies for circulares_provinciais
-- ============================================

ALTER TABLE circulares_provinciais ENABLE ROW LEVEL SECURITY;

-- Direção Provincial can manage circulars in their province
CREATE POLICY "Direcao Provincial can manage circulares in provincia"
    ON circulares_provinciais FOR ALL
    USING (
        is_direcao_provincial() AND 
        provincia = get_direcao_provincia()
    );

-- Municipal directorates can view published circulars from their province
CREATE POLICY "Direcao Municipal can view circulares provinciais"
    ON circulares_provinciais FOR SELECT
    USING (
        publicado = true AND 
        is_direcao_municipal() AND
        provincia = (SELECT dm.provincia FROM direcoes_municipais dm WHERE dm.user_id = auth.uid() AND dm.ativo = true LIMIT 1)
    );

-- Schools can view published circulars from their province
CREATE POLICY "Escolas can view circulares provinciais"
    ON circulares_provinciais FOR SELECT
    USING (
        publicado = true AND
        EXISTS (
            SELECT 1 FROM escolas e 
            WHERE e.provincia = circulares_provinciais.provincia
            AND EXISTS (
                SELECT 1 FROM user_profiles up 
                WHERE up.user_id = auth.uid() 
                AND up.escola_id = e.id 
                AND up.ativo = true
            )
        )
    );

-- SUPERADMIN can manage all
CREATE POLICY "SUPERADMIN can manage all circulares_provinciais"
    ON circulares_provinciais FOR ALL
    USING (is_superadmin());

-- ============================================
-- PHASE 10: RLS Policies for leituras_circulares_provinciais
-- ============================================

ALTER TABLE leituras_circulares_provinciais ENABLE ROW LEVEL SECURITY;

-- Direção Provincial can view readings for their circulars
CREATE POLICY "Direcao Provincial can view leituras"
    ON leituras_circulares_provinciais FOR SELECT
    USING (
        is_direcao_provincial() AND
        circular_id IN (
            SELECT id FROM circulares_provinciais 
            WHERE provincia = get_direcao_provincia()
        )
    );

-- Anyone can insert their own reading
CREATE POLICY "Users can insert own leitura"
    ON leituras_circulares_provinciais FOR INSERT
    WITH CHECK (lido_por = auth.uid());

-- SUPERADMIN can manage all
CREATE POLICY "SUPERADMIN can manage leituras_circulares_provinciais"
    ON leituras_circulares_provinciais FOR ALL
    USING (is_superadmin());

-- ============================================
-- PHASE 11: RLS Policies for direcoes_municipais (Provincial access)
-- ============================================

-- Direção Provincial can VIEW municipal directorates in their province
CREATE POLICY "Direcao Provincial can view direcoes_municipais in provincia"
    ON direcoes_municipais FOR SELECT
    USING (is_direcao_provincial() AND provincia = get_direcao_provincia());

-- Direção Provincial can UPDATE municipal directorates in their province (suspend/reactivate)
CREATE POLICY "Direcao Provincial can update direcoes_municipais in provincia"
    ON direcoes_municipais FOR UPDATE
    USING (is_direcao_provincial() AND provincia = get_direcao_provincia());

-- ============================================
-- PHASE 12: RLS Policies for escolas (Provincial READ access)
-- ============================================

-- Direção Provincial can VIEW schools in their province
CREATE POLICY "Direcao Provincial can view escolas in provincia"
    ON escolas FOR SELECT
    USING (is_direcao_provincial() AND provincia = get_direcao_provincia());

-- ============================================
-- PHASE 13: RLS Policies for related tables (Provincial READ access)
-- ============================================

-- Turmas: Direção Provincial can view turmas from schools in their province
CREATE POLICY "Direcao Provincial can view turmas in provincia"
    ON turmas FOR SELECT
    USING (
        is_direcao_provincial() AND 
        escola_in_direcao_provincia(escola_id)
    );

-- Alunos: Direção Provincial can view alunos from schools in their province
CREATE POLICY "Direcao Provincial can view alunos in provincia"
    ON alunos FOR SELECT
    USING (
        is_direcao_provincial() AND 
        turma_id IN (
            SELECT t.id FROM turmas t 
            WHERE escola_in_direcao_provincia(t.escola_id)
        )
    );

-- Professores: Direção Provincial can view professores from schools in their province
CREATE POLICY "Direcao Provincial can view professores in provincia"
    ON professores FOR SELECT
    USING (
        is_direcao_provincial() AND 
        escola_in_direcao_provincia(escola_id)
    );

-- Notas Finais: Direção Provincial can view notas_finais from schools in their province
CREATE POLICY "Direcao Provincial can view notas_finais in provincia"
    ON notas_finais FOR SELECT
    USING (
        is_direcao_provincial() AND 
        turma_id IN (
            SELECT t.id FROM turmas t 
            WHERE escola_in_direcao_provincia(t.escola_id)
        )
    );

-- User Profiles: Direção Provincial can view user profiles from their province
CREATE POLICY "Direcao Provincial can view user_profiles in provincia"
    ON user_profiles FOR SELECT
    USING (
        is_direcao_provincial() AND (
            escola_id IN (
                SELECT e.id FROM escolas e 
                WHERE e.provincia = get_direcao_provincia()
            )
            OR user_id = auth.uid()
        )
    );

-- ============================================
-- PHASE 14: Notification Triggers for Circulares Provinciais
-- ============================================

-- Notify Municipal Directorates when provincial circular is published
CREATE OR REPLACE FUNCTION notify_direcao_municipal_circular_provincial()
RETURNS TRIGGER AS $$
DECLARE
    direcao_record RECORD;
BEGIN
    -- Only notify when a circular is published
    IF NEW.publicado = true AND (OLD.publicado IS NULL OR OLD.publicado = false) THEN
        -- Set publication date
        NEW.data_publicacao := NOW();
        
        -- Notify all municipal directorates in the province
        FOR direcao_record IN 
            SELECT user_id, nome FROM direcoes_municipais 
            WHERE provincia = NEW.provincia AND ativo = true AND user_id IS NOT NULL
        LOOP
            INSERT INTO notificacoes (
                destinatario_id, 
                tipo, 
                titulo, 
                mensagem, 
                dados_adicionais
            ) VALUES (
                direcao_record.user_id,
                'circular_provincial',
                CASE 
                    WHEN NEW.urgente THEN '🔴 Circular Provincial URGENTE'
                    ELSE '📜 Nova Circular Provincial'
                END,
                NEW.titulo,
                jsonb_build_object(
                    'circular_id', NEW.id,
                    'tipo', NEW.tipo,
                    'urgente', NEW.urgente,
                    'provincia', NEW.provincia
                )
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_circular_provincial ON circulares_provinciais;
CREATE TRIGGER trigger_notify_circular_provincial
    BEFORE UPDATE ON circulares_provinciais
    FOR EACH ROW
    EXECUTE FUNCTION notify_direcao_municipal_circular_provincial();

-- Also trigger on insert if already published
CREATE OR REPLACE FUNCTION notify_circular_provincial_insert()
RETURNS TRIGGER AS $$
DECLARE
    direcao_record RECORD;
BEGIN
    IF NEW.publicado = true THEN
        -- Set publication date
        NEW.data_publicacao := COALESCE(NEW.data_publicacao, NOW());
        
        -- Notify all municipal directorates in the province
        FOR direcao_record IN 
            SELECT user_id, nome FROM direcoes_municipais 
            WHERE provincia = NEW.provincia AND ativo = true AND user_id IS NOT NULL
        LOOP
            INSERT INTO notificacoes (
                destinatario_id, 
                tipo, 
                titulo, 
                mensagem, 
                dados_adicionais
            ) VALUES (
                direcao_record.user_id,
                'circular_provincial',
                CASE 
                    WHEN NEW.urgente THEN '🔴 Circular Provincial URGENTE'
                    ELSE '📜 Nova Circular Provincial'
                END,
                NEW.titulo,
                jsonb_build_object(
                    'circular_id', NEW.id,
                    'tipo', NEW.tipo,
                    'urgente', NEW.urgente,
                    'provincia', NEW.provincia
                )
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_circular_provincial_insert ON circulares_provinciais;
CREATE TRIGGER trigger_notify_circular_provincial_insert
    BEFORE INSERT ON circulares_provinciais
    FOR EACH ROW
    EXECUTE FUNCTION notify_circular_provincial_insert();

-- ============================================
-- PHASE 15: RPC for Provincial Statistics
-- ============================================

-- Get provincial statistics
CREATE OR REPLACE FUNCTION get_estatisticas_provincia(p_provincia TEXT)
RETURNS TABLE (
    total_municipios INTEGER,
    total_direcoes_municipais INTEGER,
    direcoes_activas INTEGER,
    direcoes_inactivas INTEGER,
    total_escolas INTEGER,
    escolas_activas INTEGER,
    total_professores BIGINT,
    total_alunos BIGINT,
    total_turmas BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            COUNT(DISTINCT dm.municipio)::INTEGER as total_municipios,
            COUNT(DISTINCT dm.id)::INTEGER as total_direcoes,
            COUNT(DISTINCT dm.id) FILTER (WHERE dm.ativo = true)::INTEGER as direcoes_activas,
            COUNT(DISTINCT dm.id) FILTER (WHERE dm.ativo = false)::INTEGER as direcoes_inactivas
        FROM direcoes_municipais dm
        WHERE dm.provincia = p_provincia
    ),
    escola_stats AS (
        SELECT 
            COUNT(DISTINCT e.id)::INTEGER as total_escolas,
            COUNT(DISTINCT e.id) FILTER (WHERE e.ativo = true AND NOT COALESCE(e.bloqueado, false))::INTEGER as escolas_activas
        FROM escolas e
        WHERE e.provincia = p_provincia
    ),
    prof_stats AS (
        SELECT COUNT(*)::BIGINT as total_professores
        FROM professores p
        JOIN escolas e ON p.escola_id = e.id
        WHERE e.provincia = p_provincia AND p.ativo = true
    ),
    aluno_stats AS (
        SELECT COUNT(*)::BIGINT as total_alunos
        FROM alunos a
        JOIN turmas t ON a.turma_id = t.id
        JOIN escolas e ON t.escola_id = e.id
        WHERE e.provincia = p_provincia AND a.ativo = true
    ),
    turma_stats AS (
        SELECT COUNT(*)::BIGINT as total_turmas
        FROM turmas t
        JOIN escolas e ON t.escola_id = e.id
        WHERE e.provincia = p_provincia
    )
    SELECT 
        s.total_municipios,
        s.total_direcoes,
        s.direcoes_activas,
        s.direcoes_inactivas,
        es.total_escolas,
        es.escolas_activas,
        ps.total_professores,
        als.total_alunos,
        ts.total_turmas
    FROM stats s, escola_stats es, prof_stats ps, aluno_stats als, turma_stats ts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get statistics by municipality
CREATE OR REPLACE FUNCTION get_estatisticas_por_municipio(p_provincia TEXT)
RETURNS TABLE (
    municipio TEXT,
    total_escolas INTEGER,
    escolas_activas INTEGER,
    total_professores BIGINT,
    total_alunos BIGINT,
    total_turmas BIGINT,
    media_aprovacao NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.municipio,
        COUNT(DISTINCT e.id)::INTEGER as total_escolas,
        COUNT(DISTINCT e.id) FILTER (WHERE e.ativo = true AND NOT COALESCE(e.bloqueado, false))::INTEGER as escolas_activas,
        COUNT(DISTINCT p.id)::BIGINT as total_professores,
        COUNT(DISTINCT a.id)::BIGINT as total_alunos,
        COUNT(DISTINCT t.id)::BIGINT as total_turmas,
        COALESCE(AVG(nf.nota_final), 0)::NUMERIC as media_aprovacao
    FROM escolas e
    LEFT JOIN professores p ON p.escola_id = e.id AND p.ativo = true
    LEFT JOIN turmas t ON t.escola_id = e.id
    LEFT JOIN alunos a ON a.turma_id = t.id AND a.ativo = true
    LEFT JOIN notas_finais nf ON nf.turma_id = t.id
    WHERE e.provincia = p_provincia
    GROUP BY e.municipio
    ORDER BY e.municipio;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- PHASE 16: Grant Permissions
-- ============================================

GRANT SELECT, INSERT, UPDATE ON direcoes_provinciais TO authenticated;
GRANT SELECT, INSERT ON historico_administrativo_direcoes_municipais TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON circulares_provinciais TO authenticated;
GRANT SELECT, INSERT ON leituras_circulares_provinciais TO authenticated;

GRANT EXECUTE ON FUNCTION is_direcao_provincial() TO authenticated;
GRANT EXECUTE ON FUNCTION get_direcao_provincia() TO authenticated;
GRANT EXECUTE ON FUNCTION escola_in_direcao_provincia(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION direcao_municipal_in_provincia(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_estatisticas_provincia(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_estatisticas_por_municipio(TEXT) TO authenticated;

-- ============================================
-- END OF MIGRATION
-- ============================================
