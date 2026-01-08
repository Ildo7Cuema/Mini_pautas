-- ============================================
-- MIGRATION: Add System Visits Tracking
-- Purpose: Track all system access/visits for SuperAdmin visibility
-- Date: 2026-01-08
-- ============================================

-- Create system_visits table to track all logins/accesses
CREATE TABLE IF NOT EXISTS system_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    escola_id UUID REFERENCES escolas(id) ON DELETE SET NULL,
    tipo_perfil TEXT,
    ip_address TEXT,
    user_agent TEXT,
    device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'unknown')),
    browser TEXT,
    os TEXT,
    session_duration_seconds INTEGER,
    page_views INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_system_visits_user ON system_visits(user_id);
CREATE INDEX idx_system_visits_escola ON system_visits(escola_id);
CREATE INDEX idx_system_visits_created ON system_visits(created_at DESC);
CREATE INDEX idx_system_visits_tipo_perfil ON system_visits(tipo_perfil);



-- Enable RLS
ALTER TABLE system_visits ENABLE ROW LEVEL SECURITY;

-- Only SUPERADMIN can view all visits
CREATE POLICY "SUPERADMIN can view all visits"
    ON system_visits FOR SELECT
    USING (is_superadmin());

-- Any authenticated user can insert their own visit
CREATE POLICY "Users can insert own visits"
    ON system_visits FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Add comments for documentation
COMMENT ON TABLE system_visits IS 'Tracks all system access/visits for SuperAdmin monitoring';
COMMENT ON COLUMN system_visits.tipo_perfil IS 'User profile type at time of visit (ESCOLA, PROFESSOR, ALUNO, etc.)';
COMMENT ON COLUMN system_visits.device_type IS 'Device category detected from user agent';
COMMENT ON COLUMN system_visits.session_duration_seconds IS 'Optional session duration if tracked';

-- Helper function to log system visits
CREATE OR REPLACE FUNCTION log_system_visit(
    p_escola_id UUID DEFAULT NULL,
    p_tipo_perfil TEXT DEFAULT NULL,
    p_device_type TEXT DEFAULT 'unknown',
    p_browser TEXT DEFAULT NULL,
    p_os TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_visit_id UUID;
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

    -- Insert visit log
    INSERT INTO system_visits (
        user_id,
        escola_id,
        tipo_perfil,
        ip_address,
        user_agent,
        device_type,
        browser,
        os
    ) VALUES (
        auth.uid(),
        p_escola_id,
        p_tipo_perfil,
        v_ip_address,
        v_user_agent,
        COALESCE(p_device_type, 'unknown'),
        p_browser,
        p_os
    )
    RETURNING id INTO v_visit_id;

    RETURN v_visit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the logging function
GRANT EXECUTE ON FUNCTION log_system_visit TO authenticated;

-- View for aggregated visit statistics (for SuperAdmin dashboard)
CREATE OR REPLACE VIEW system_visit_stats AS
SELECT
    COUNT(*) AS total_visits,
    COUNT(DISTINCT user_id) AS unique_users,
    COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) AS visits_today,
    COUNT(DISTINCT user_id) FILTER (WHERE DATE(created_at) = CURRENT_DATE) AS unique_users_today,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS visits_last_7_days,
    COUNT(DISTINCT user_id) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS unique_users_last_7_days,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS visits_last_30_days,
    COUNT(DISTINCT user_id) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS unique_users_last_30_days,
    -- By device type
    COUNT(*) FILTER (WHERE device_type = 'mobile') AS mobile_visits,
    COUNT(*) FILTER (WHERE device_type = 'tablet') AS tablet_visits,
    COUNT(*) FILTER (WHERE device_type = 'desktop') AS desktop_visits,
    -- By profile type (top 5)
    (
        SELECT jsonb_agg(jsonb_build_object('tipo', tipo_perfil, 'count', cnt))
        FROM (
            SELECT tipo_perfil, COUNT(*) AS cnt
            FROM system_visits
            WHERE tipo_perfil IS NOT NULL
            GROUP BY tipo_perfil
            ORDER BY cnt DESC
            LIMIT 5
        ) sub
    ) AS visits_by_profile
FROM system_visits;

-- Grant access to the view for authenticated users (RLS on base table will filter)
GRANT SELECT ON system_visit_stats TO authenticated;

-- ============================================
-- END OF MIGRATION
-- ============================================
