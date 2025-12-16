-- ============================================
-- MIGRATION: Create SUPERADMIN Audit Table
-- Purpose: Track all SUPERADMIN actions for governance and compliance
-- Date: 2025-12-16
-- ============================================

-- Create superadmin_actions table for audit trail
CREATE TABLE IF NOT EXISTS superadmin_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    superadmin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL CHECK (action_type IN (
        'ACTIVATE_ESCOLA',
        'DEACTIVATE_ESCOLA',
        'BLOCK_ESCOLA',
        'UNBLOCK_ESCOLA',
        'EDIT_ESCOLA',
        'CREATE_ESCOLA',
        'DELETE_ESCOLA',
        'VIEW_ESCOLA_DATA',
        'EDIT_SYSTEM_CONFIG',
        'CREATE_USER',
        'EDIT_USER',
        'DELETE_USER',
        'EXPORT_DATA',
        'OTHER'
    )),
    target_escola_id UUID REFERENCES escolas(id) ON DELETE SET NULL,
    action_details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_superadmin_actions_user ON superadmin_actions(superadmin_user_id);
CREATE INDEX idx_superadmin_actions_type ON superadmin_actions(action_type);
CREATE INDEX idx_superadmin_actions_escola ON superadmin_actions(target_escola_id);
CREATE INDEX idx_superadmin_actions_created ON superadmin_actions(created_at DESC);
CREATE INDEX idx_superadmin_actions_user_date ON superadmin_actions(superadmin_user_id, created_at DESC);

-- Enable RLS
ALTER TABLE superadmin_actions ENABLE ROW LEVEL SECURITY;

-- Only SUPERADMIN can view audit logs
CREATE POLICY "SUPERADMIN can view all audit logs"
    ON superadmin_actions FOR SELECT
    USING (is_superadmin());

-- System can insert audit logs (via triggers/functions)
CREATE POLICY "System can insert audit logs"
    ON superadmin_actions FOR INSERT
    WITH CHECK (true);

-- Add audit trigger for superadmin_actions table itself
CREATE TRIGGER audit_superadmin_actions 
    AFTER INSERT OR UPDATE OR DELETE ON superadmin_actions
    FOR EACH ROW 
    EXECUTE FUNCTION audit_trigger_function();

-- Add comments for documentation
COMMENT ON TABLE superadmin_actions IS 'Audit trail for all SUPERADMIN actions in the system';
COMMENT ON COLUMN superadmin_actions.action_type IS 'Type of action performed by SUPERADMIN';
COMMENT ON COLUMN superadmin_actions.target_escola_id IS 'School affected by the action (if applicable)';
COMMENT ON COLUMN superadmin_actions.action_details IS 'Detailed information about the action (before/after state, parameters, etc.)';

-- Helper function to log SUPERADMIN actions
CREATE OR REPLACE FUNCTION log_superadmin_action(
    p_action_type TEXT,
    p_target_escola_id UUID DEFAULT NULL,
    p_action_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_action_id UUID;
    v_ip_address TEXT;
    v_user_agent TEXT;
BEGIN
    -- Get IP address and user agent from request headers if available
    BEGIN
        v_ip_address := COALESCE(
            current_setting('request.headers', true)::json->>'x-real-ip',
            current_setting('request.headers', true)::json->>'x-forwarded-for',
            'unknown'
        );
        v_user_agent := COALESCE(
            current_setting('request.headers', true)::json->>'user-agent',
            'unknown'
        );
    EXCEPTION WHEN OTHERS THEN
        v_ip_address := 'unknown';
        v_user_agent := 'unknown';
    END;

    -- Insert audit log
    INSERT INTO superadmin_actions (
        superadmin_user_id,
        action_type,
        target_escola_id,
        action_details,
        ip_address,
        user_agent
    ) VALUES (
        auth.uid(),
        p_action_type,
        p_target_escola_id,
        p_action_details,
        v_ip_address,
        v_user_agent
    )
    RETURNING id INTO v_action_id;

    RETURN v_action_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the logging function
GRANT EXECUTE ON FUNCTION log_superadmin_action TO authenticated;

-- ============================================
-- END OF MIGRATION
-- ============================================
