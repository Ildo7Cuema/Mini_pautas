-- ============================================
-- MIGRATION: Auto Link Professors to Auth Users
-- Purpose: Automatically link a new auth user to an existing professor profile based on email
-- ============================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_professor_user()
RETURNS TRIGGER AS $$
DECLARE
    prof_id UUID;
    existing_user_id UUID;
BEGIN
    -- Check if there is a professor with this email
    SELECT id, user_id INTO prof_id, existing_user_id
    FROM public.professores
    WHERE email = NEW.email
    LIMIT 1;

    -- If professor exists
    IF prof_id IS NOT NULL THEN
        -- If already linked to another user, we might want to error or ignore.
        -- For now, let's only link if user_id is NULL to avoid account takeover.
        IF existing_user_id IS NULL THEN
            UPDATE public.professores
            SET user_id = NEW.id
            WHERE id = prof_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run after a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_link_professor ON auth.users;
CREATE TRIGGER on_auth_user_created_link_professor
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_professor_user();
