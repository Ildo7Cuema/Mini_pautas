-- ============================================
-- MIGRATION: Allow Nullable User ID for Professors
-- Purpose: Allow creating professor records without an immediate Auth User linkage.
--          This enables the "Invite/Claim" flow where the School Admin creates the 
--          professor first, and the Auth User is linked later via Trigger.
-- ============================================

ALTER TABLE public.professores
ALTER COLUMN user_id DROP NOT NULL;

-- Comment to explain the change
COMMENT ON COLUMN public.professores.user_id IS 'Link to auth.users. Can be NULL if the professor has been invited but hasn''t registered yet.';
