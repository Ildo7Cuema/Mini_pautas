-- ============================================
-- MIGRATION 001: Add User Profiles Table
-- Purpose: Create centralized user profile management with role-based access
-- ============================================

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    tipo_perfil TEXT NOT NULL CHECK (tipo_perfil IN ('ESCOLA', 'PROFESSOR')),
    escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    ativo BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_escola_id ON user_profiles(escola_id);
CREATE INDEX idx_user_profiles_tipo ON user_profiles(tipo_perfil);
CREATE INDEX idx_user_profiles_ativo ON user_profiles(ativo);

-- Add updated_at trigger
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add audit trigger
CREATE TRIGGER audit_user_profiles 
    AFTER INSERT OR UPDATE OR DELETE ON user_profiles
    FOR EACH ROW 
    EXECUTE FUNCTION audit_trigger_function();

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile"
    ON user_profiles FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (user_id = auth.uid());

-- Schools can view profiles of their teachers
CREATE POLICY "Schools can view their teachers profiles"
    ON user_profiles FOR SELECT
    USING (
        escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
        )
    );

-- Schools can create teacher profiles
CREATE POLICY "Schools can create teacher profiles"
    ON user_profiles FOR INSERT
    WITH CHECK (
        tipo_perfil = 'PROFESSOR' 
        AND escola_id IN (
            SELECT escola_id FROM user_profiles 
            WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
        )
    );

-- Add user_id column to escolas table
ALTER TABLE escolas 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create unique index for escola user_id
CREATE UNIQUE INDEX idx_escolas_user_id ON escolas(user_id) 
    WHERE user_id IS NOT NULL;

-- Function to automatically create user profile after escola creation
CREATE OR REPLACE FUNCTION create_escola_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create profile if user_id is set
    IF NEW.user_id IS NOT NULL THEN
        INSERT INTO user_profiles (user_id, tipo_perfil, escola_id, ativo)
        VALUES (NEW.user_id, 'ESCOLA', NEW.id, true)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create escola profile automatically
CREATE TRIGGER trigger_create_escola_profile
    AFTER INSERT OR UPDATE OF user_id ON escolas
    FOR EACH ROW
    EXECUTE FUNCTION create_escola_profile();

-- Function to automatically create professor profile
CREATE OR REPLACE FUNCTION create_professor_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create profile if user_id is set
    IF NEW.user_id IS NOT NULL THEN
        INSERT INTO user_profiles (user_id, tipo_perfil, escola_id, ativo)
        VALUES (NEW.user_id, 'PROFESSOR', NEW.escola_id, NEW.ativo)
        ON CONFLICT (user_id) DO UPDATE 
        SET ativo = NEW.ativo, escola_id = NEW.escola_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create/update professor profile automatically
CREATE TRIGGER trigger_create_professor_profile
    AFTER INSERT OR UPDATE OF user_id, ativo, escola_id ON professores
    FOR EACH ROW
    EXECUTE FUNCTION create_professor_profile();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;

-- Comments for documentation
COMMENT ON TABLE user_profiles IS 'Centralized user profile management with role-based access control';
COMMENT ON COLUMN user_profiles.tipo_perfil IS 'User role: ESCOLA (school admin) or PROFESSOR (teacher)';
COMMENT ON COLUMN user_profiles.escola_id IS 'Reference to the school this user belongs to';
COMMENT ON COLUMN user_profiles.ativo IS 'Whether this profile is active';
COMMENT ON COLUMN user_profiles.metadata IS 'Additional profile metadata in JSON format';
