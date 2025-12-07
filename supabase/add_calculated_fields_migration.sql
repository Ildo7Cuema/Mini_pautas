-- ============================================
-- MIGRATION: Add Calculated Fields Support
-- Description: Adds support for calculated components in componentes_avaliacao table
-- Date: 2025-12-07
-- ============================================

-- Add new columns to componentes_avaliacao table
ALTER TABLE componentes_avaliacao
ADD COLUMN IF NOT EXISTS is_calculated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS formula_expression TEXT,
ADD COLUMN IF NOT EXISTS depends_on_components JSONB DEFAULT '[]'::jsonb;

-- Add check constraint to ensure calculated components have a formula
ALTER TABLE componentes_avaliacao
ADD CONSTRAINT check_calculated_has_formula 
CHECK (
    (is_calculated = false) OR 
    (is_calculated = true AND formula_expression IS NOT NULL AND formula_expression != '')
);

-- Add comment to columns for documentation
COMMENT ON COLUMN componentes_avaliacao.is_calculated IS 'Indicates if this component is automatically calculated from other components';
COMMENT ON COLUMN componentes_avaliacao.formula_expression IS 'Mathematical formula expression using component codes as variables (e.g., "MAC * 0.4 + EXAME * 0.6")';
COMMENT ON COLUMN componentes_avaliacao.depends_on_components IS 'JSON array of component IDs that this calculated component depends on';

-- Create index for performance when querying calculated components
CREATE INDEX IF NOT EXISTS idx_componentes_is_calculated ON componentes_avaliacao(is_calculated);

-- Create index for querying dependencies
CREATE INDEX IF NOT EXISTS idx_componentes_depends ON componentes_avaliacao USING GIN (depends_on_components);

-- ============================================
-- VALIDATION FUNCTION
-- ============================================

-- Function to validate that calculated components don't create circular dependencies
CREATE OR REPLACE FUNCTION validate_component_dependencies()
RETURNS TRIGGER AS $$
DECLARE
    dep_component_id UUID;
    dep_is_calculated BOOLEAN;
    dep_depends_on JSONB;
BEGIN
    -- Only validate if this is a calculated component
    IF NEW.is_calculated = true THEN
        -- Check each dependency
        FOR dep_component_id IN 
            SELECT jsonb_array_elements_text(NEW.depends_on_components)::UUID
        LOOP
            -- Get the dependency's calculated status and dependencies
            SELECT is_calculated, depends_on_components 
            INTO dep_is_calculated, dep_depends_on
            FROM componentes_avaliacao
            WHERE id = dep_component_id;
            
            -- If dependency is also calculated, check for circular reference
            IF dep_is_calculated = true THEN
                -- Check if the dependency depends on this component (direct circular reference)
                IF dep_depends_on ? NEW.id::TEXT THEN
                    RAISE EXCEPTION 'Circular dependency detected: Component % depends on %, which depends back on %', 
                        NEW.codigo_componente, dep_component_id, NEW.id;
                END IF;
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate dependencies before insert or update
DROP TRIGGER IF EXISTS validate_component_deps ON componentes_avaliacao;
CREATE TRIGGER validate_component_deps
    BEFORE INSERT OR UPDATE ON componentes_avaliacao
    FOR EACH ROW
    EXECUTE FUNCTION validate_component_dependencies();

-- ============================================
-- END OF MIGRATION
-- ============================================
