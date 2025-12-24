-- ============================================
-- MIGRATION: Add SECRETARIO Role Support
-- Purpose: Add secretary role with limited access to payments and student registration
-- Date: 2025-12-24
-- ============================================

-- Step 1: Drop existing CHECK constraint on tipo_perfil
ALTER TABLE user_profiles 
    DROP CONSTRAINT IF EXISTS user_profiles_tipo_perfil_check;

-- Step 2: Add new CHECK constraint including SECRETARIO
ALTER TABLE user_profiles 
    ADD CONSTRAINT user_profiles_tipo_perfil_check 
    CHECK (tipo_perfil IN ('ESCOLA', 'PROFESSOR', 'SUPERADMIN', 'ALUNO', 'ENCARREGADO', 'SECRETARIO'));

-- Step 3: Update superadmin escola check to include SECRETARIO as requiring escola_id
ALTER TABLE user_profiles 
    DROP CONSTRAINT IF EXISTS user_profiles_superadmin_escola_check;

ALTER TABLE user_profiles 
    ADD CONSTRAINT user_profiles_superadmin_escola_check 
    CHECK (
        (tipo_perfil = 'SUPERADMIN' AND escola_id IS NULL) OR 
        (tipo_perfil != 'SUPERADMIN' AND escola_id IS NOT NULL)
    );

-- Step 4: Create secretarios table
CREATE TABLE IF NOT EXISTS secretarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome_completo TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT,
    numero_funcionario TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create indexes for secretarios
CREATE INDEX IF NOT EXISTS idx_secretarios_escola ON secretarios(escola_id);
CREATE INDEX IF NOT EXISTS idx_secretarios_user ON secretarios(user_id);
CREATE INDEX IF NOT EXISTS idx_secretarios_email ON secretarios(email);
CREATE INDEX IF NOT EXISTS idx_secretarios_ativo ON secretarios(ativo);

-- Step 6: Add updated_at trigger
DROP TRIGGER IF EXISTS update_secretarios_updated_at ON secretarios;
CREATE TRIGGER update_secretarios_updated_at 
    BEFORE UPDATE ON secretarios
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Add audit trigger
DROP TRIGGER IF EXISTS audit_secretarios ON secretarios;
CREATE TRIGGER audit_secretarios 
    AFTER INSERT OR UPDATE OR DELETE ON secretarios
    FOR EACH ROW 
    EXECUTE FUNCTION audit_trigger_function();

-- Step 8: Enable RLS on secretarios
ALTER TABLE secretarios ENABLE ROW LEVEL SECURITY;

-- Step 9: Create function to check if user is SECRETARIO
CREATE OR REPLACE FUNCTION is_secretario()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND tipo_perfil = 'SECRETARIO' 
        AND ativo = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 10: Function to automatically create secretario profile
CREATE OR REPLACE FUNCTION create_secretario_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create profile if user_id is set
    IF NEW.user_id IS NOT NULL THEN
        INSERT INTO user_profiles (user_id, tipo_perfil, escola_id, ativo)
        VALUES (NEW.user_id, 'SECRETARIO', NEW.escola_id, NEW.ativo)
        ON CONFLICT (user_id) DO UPDATE 
        SET ativo = NEW.ativo, escola_id = NEW.escola_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 11: Trigger to create/update secretario profile automatically
DROP TRIGGER IF EXISTS trigger_create_secretario_profile ON secretarios;
CREATE TRIGGER trigger_create_secretario_profile
    AFTER INSERT OR UPDATE OF user_id, ativo, escola_id ON secretarios
    FOR EACH ROW
    EXECUTE FUNCTION create_secretario_profile();

-- Step 12: RLS Policies for secretarios table

-- Schools can view their secretaries
DROP POLICY IF EXISTS "Schools can view their secretarios" ON secretarios;
CREATE POLICY "Schools can view their secretarios"
    ON secretarios FOR SELECT
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA' AND ativo = true
        )
    );

-- Schools can create secretaries
DROP POLICY IF EXISTS "Schools can insert secretarios" ON secretarios;
CREATE POLICY "Schools can insert secretarios"
    ON secretarios FOR INSERT
    WITH CHECK (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA' AND ativo = true
        )
    );

-- Schools can update their secretaries
DROP POLICY IF EXISTS "Schools can update their secretarios" ON secretarios;
CREATE POLICY "Schools can update their secretarios"
    ON secretarios FOR UPDATE
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA' AND ativo = true
        )
    );

-- Schools can delete their secretaries
DROP POLICY IF EXISTS "Schools can delete their secretarios" ON secretarios;
CREATE POLICY "Schools can delete their secretarios"
    ON secretarios FOR DELETE
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA' AND ativo = true
        )
    );

-- Secretaries can view own profile
DROP POLICY IF EXISTS "Secretarios can view own profile" ON secretarios;
CREATE POLICY "Secretarios can view own profile"
    ON secretarios FOR SELECT
    USING (user_id = auth.uid());

-- SUPERADMIN full access
DROP POLICY IF EXISTS "SUPERADMIN can view all secretarios" ON secretarios;
CREATE POLICY "SUPERADMIN can view all secretarios"
    ON secretarios FOR SELECT
    USING (is_superadmin());

DROP POLICY IF EXISTS "SUPERADMIN can insert secretarios" ON secretarios;
CREATE POLICY "SUPERADMIN can insert secretarios"
    ON secretarios FOR INSERT
    WITH CHECK (is_superadmin());

DROP POLICY IF EXISTS "SUPERADMIN can update all secretarios" ON secretarios;
CREATE POLICY "SUPERADMIN can update all secretarios"
    ON secretarios FOR UPDATE
    USING (is_superadmin());

DROP POLICY IF EXISTS "SUPERADMIN can delete secretarios" ON secretarios;
CREATE POLICY "SUPERADMIN can delete secretarios"
    ON secretarios FOR DELETE
    USING (is_superadmin());

-- Step 13: Grant SECRETARIO access to relevant tables

-- Secretarios can view alunos from their school
DROP POLICY IF EXISTS "SECRETARIO can view school alunos" ON alunos;
CREATE POLICY "SECRETARIO can view school alunos"
    ON alunos FOR SELECT
    USING (
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'SECRETARIO' AND ativo = true
            )
        )
    );

-- Secretarios can create alunos in their school
DROP POLICY IF EXISTS "SECRETARIO can insert alunos" ON alunos;
CREATE POLICY "SECRETARIO can insert alunos"
    ON alunos FOR INSERT
    WITH CHECK (
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'SECRETARIO' AND ativo = true
            )
        )
    );

-- Secretarios can update alunos in their school
DROP POLICY IF EXISTS "SECRETARIO can update alunos" ON alunos;
CREATE POLICY "SECRETARIO can update alunos"
    ON alunos FOR UPDATE
    USING (
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'SECRETARIO' AND ativo = true
            )
        )
    );

-- Secretarios can delete alunos in their school
DROP POLICY IF EXISTS "SECRETARIO can delete alunos" ON alunos;
CREATE POLICY "SECRETARIO can delete alunos"
    ON alunos FOR DELETE
    USING (
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'SECRETARIO' AND ativo = true
            )
        )
    );

-- Secretarios can view turmas from their school (for dropdown selection)
DROP POLICY IF EXISTS "SECRETARIO can view school turmas" ON turmas;
CREATE POLICY "SECRETARIO can view school turmas"
    ON turmas FOR SELECT
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'SECRETARIO' AND ativo = true
        )
    );

-- Secretarios can view propinas_config from their school
DROP POLICY IF EXISTS "SECRETARIO can view propinas_config" ON propinas_config;
CREATE POLICY "SECRETARIO can view propinas_config"
    ON propinas_config FOR SELECT
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'SECRETARIO' AND ativo = true
        )
    );

-- Secretarios can create propinas_config
DROP POLICY IF EXISTS "SECRETARIO can insert propinas_config" ON propinas_config;
CREATE POLICY "SECRETARIO can insert propinas_config"
    ON propinas_config FOR INSERT
    WITH CHECK (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'SECRETARIO' AND ativo = true
        )
    );

-- Secretarios can update propinas_config
DROP POLICY IF EXISTS "SECRETARIO can update propinas_config" ON propinas_config;
CREATE POLICY "SECRETARIO can update propinas_config"
    ON propinas_config FOR UPDATE
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'SECRETARIO' AND ativo = true
        )
    );

-- Secretarios can view pagamentos_propinas from their school
DROP POLICY IF EXISTS "SECRETARIO can view pagamentos_propinas" ON pagamentos_propinas;
CREATE POLICY "SECRETARIO can view pagamentos_propinas"
    ON pagamentos_propinas FOR SELECT
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'SECRETARIO' AND ativo = true
        )
    );

-- Secretarios can create pagamentos_propinas
DROP POLICY IF EXISTS "SECRETARIO can insert pagamentos_propinas" ON pagamentos_propinas;
CREATE POLICY "SECRETARIO can insert pagamentos_propinas"
    ON pagamentos_propinas FOR INSERT
    WITH CHECK (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'SECRETARIO' AND ativo = true
        )
    );

-- Secretarios can update pagamentos_propinas
DROP POLICY IF EXISTS "SECRETARIO can update pagamentos_propinas" ON pagamentos_propinas;
CREATE POLICY "SECRETARIO can update pagamentos_propinas"
    ON pagamentos_propinas FOR UPDATE
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'SECRETARIO' AND ativo = true
        )
    );

-- Step 14: Grant SECRETARIO access to escolas (read only for header info)
-- Allow access via both user_profiles AND direct secretarios relation
DROP POLICY IF EXISTS "SECRETARIO can view own escola" ON escolas;
CREATE POLICY "SECRETARIO can view own escola"
    ON escolas FOR SELECT
    USING (
        id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'SECRETARIO' AND ativo = true
        )
        OR id IN (
            SELECT escola_id FROM secretarios 
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

-- Step 15: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON secretarios TO authenticated;

-- Step 16: Add comments for documentation
COMMENT ON TABLE secretarios IS 'School secretaries with access to payments and student registration';
COMMENT ON COLUMN secretarios.escola_id IS 'Reference to the school this secretary belongs to';
COMMENT ON COLUMN secretarios.user_id IS 'Reference to the auth user once registered';
COMMENT ON COLUMN secretarios.numero_funcionario IS 'Employee number within the school';

-- Step 17: Add RLS policy for schools to create secretario profiles
DROP POLICY IF EXISTS "Schools can create secretario profiles" ON user_profiles;
CREATE POLICY "Schools can create secretario profiles"
    ON user_profiles FOR INSERT
    WITH CHECK (
        tipo_perfil = 'SECRETARIO' 
        AND escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA' AND ativo = true
        )
    );

-- Step 18: Function to register secretario account (bypasses RLS with SECURITY DEFINER)
CREATE OR REPLACE FUNCTION register_secretario_account(
    p_email TEXT,
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_secretario RECORD;
    v_result JSONB;
BEGIN
    -- Find the secretario by email
    SELECT * INTO v_secretario
    FROM secretarios
    WHERE email = p_email AND ativo = true;

    IF v_secretario IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Secretário não encontrado com este email'
        );
    END IF;

    -- Update secretario with user_id
    UPDATE secretarios
    SET user_id = p_user_id
    WHERE id = v_secretario.id;

    -- Create user_profile for secretario
    INSERT INTO user_profiles (user_id, tipo_perfil, escola_id, ativo)
    VALUES (p_user_id, 'SECRETARIO', v_secretario.escola_id, true)
    ON CONFLICT (user_id) DO UPDATE
    SET tipo_perfil = 'SECRETARIO', escola_id = v_secretario.escola_id, ativo = true;

    RETURN jsonb_build_object(
        'success', true,
        'secretario_id', v_secretario.id,
        'escola_id', v_secretario.escola_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION register_secretario_account(TEXT, UUID) TO authenticated;

-- ============================================
-- END OF MIGRATION
-- ============================================
