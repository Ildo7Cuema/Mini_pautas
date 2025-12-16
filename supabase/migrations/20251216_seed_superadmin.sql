-- ============================================
-- MIGRATION: Seed SUPERADMIN User
-- Purpose: Create initial SUPERADMIN user with system-wide access
-- Date: 2025-12-16
-- ============================================

-- This migration is idempotent - it will not create duplicates if run multiple times

DO $$
DECLARE
    v_superadmin_user_id UUID;
    v_superadmin_email TEXT := 'superadmin@edugest.ao';
    v_superadmin_password TEXT := 'EduGest@2024!ChangeMe';
    v_profile_exists BOOLEAN;
BEGIN
    -- Check if SUPERADMIN user already exists in auth.users
    SELECT id INTO v_superadmin_user_id
    FROM auth.users
    WHERE email = v_superadmin_email;

    -- If user doesn't exist, create it
    IF v_superadmin_user_id IS NULL THEN
        RAISE NOTICE 'Creating SUPERADMIN user in auth.users...';
        
        -- Insert into auth.users
        -- Note: In production Supabase, you should use the Supabase Dashboard or Auth API
        -- This is a simplified version for development
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            v_superadmin_email,
            crypt(v_superadmin_password, gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '',
            '',
            '',
            ''
        )
        RETURNING id INTO v_superadmin_user_id;

        RAISE NOTICE 'SUPERADMIN user created with ID: %', v_superadmin_user_id;
    ELSE
        RAISE NOTICE 'SUPERADMIN user already exists with ID: %', v_superadmin_user_id;
    END IF;

    -- Check if user_profile already exists
    SELECT EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = v_superadmin_user_id
    ) INTO v_profile_exists;

    -- Create user_profile if it doesn't exist
    IF NOT v_profile_exists THEN
        RAISE NOTICE 'Creating SUPERADMIN user profile...';
        
        INSERT INTO user_profiles (
            user_id,
            tipo_perfil,
            escola_id,
            ativo,
            metadata
        ) VALUES (
            v_superadmin_user_id,
            'SUPERADMIN',
            NULL,  -- SUPERADMIN is not linked to any specific escola
            true,
            jsonb_build_object(
                'password_change_required', true,
                'created_by', 'system_seed',
                'role_description', 'System Administrator with full governance access',
                'permissions', jsonb_build_array(
                    'manage_all_escolas',
                    'view_all_data',
                    'edit_system_config',
                    'view_audit_logs',
                    'manage_users'
                )
            )
        );

        RAISE NOTICE 'SUPERADMIN user profile created successfully';
    ELSE
        RAISE NOTICE 'SUPERADMIN user profile already exists';
    END IF;

    -- Add constraint to prevent SUPERADMIN deletion
    -- This is a soft constraint via metadata flag
    UPDATE user_profiles
    SET metadata = metadata || jsonb_build_object('system_protected', true, 'deletable', false)
    WHERE user_id = v_superadmin_user_id;

    RAISE NOTICE '✅ SUPERADMIN seed completed successfully';
    RAISE NOTICE 'Email: %', v_superadmin_email;
    RAISE NOTICE 'Initial Password: % (MUST BE CHANGED ON FIRST LOGIN)', v_superadmin_password;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error creating SUPERADMIN: %', SQLERRM;
    RAISE NOTICE 'Please create SUPERADMIN manually via Supabase Dashboard:';
    RAISE NOTICE '1. Go to Authentication > Users';
    RAISE NOTICE '2. Create user with email: %', v_superadmin_email;
    RAISE NOTICE '3. Then run this migration again to create the profile';
END $$;

-- Add additional protection: trigger to prevent SUPERADMIN deletion
CREATE OR REPLACE FUNCTION prevent_superadmin_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.tipo_perfil = 'SUPERADMIN' THEN
        RAISE EXCEPTION 'Cannot delete SUPERADMIN user profile. This account is system-protected.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS protect_superadmin_deletion ON user_profiles;
CREATE TRIGGER protect_superadmin_deletion
    BEFORE DELETE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION prevent_superadmin_deletion();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Uncomment these to verify the seed was successful:

-- SELECT 
--     up.id,
--     up.user_id,
--     up.tipo_perfil,
--     up.escola_id,
--     up.ativo,
--     up.metadata,
--     au.email,
--     au.created_at
-- FROM user_profiles up
-- JOIN auth.users au ON au.id = up.user_id
-- WHERE up.tipo_perfil = 'SUPERADMIN';

-- ============================================
-- END OF MIGRATION
-- ============================================
