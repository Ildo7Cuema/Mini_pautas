-- Safe Migration: Add Calculated Fields to componentes_avaliacao
-- This version checks if columns/constraints exist before adding them

-- Add is_calculated column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'componentes_avaliacao' 
        AND column_name = 'is_calculated'
    ) THEN
        ALTER TABLE componentes_avaliacao 
        ADD COLUMN is_calculated BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add formula_expression column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'componentes_avaliacao' 
        AND column_name = 'formula_expression'
    ) THEN
        ALTER TABLE componentes_avaliacao 
        ADD COLUMN formula_expression TEXT;
    END IF;
END $$;

-- Add depends_on_components column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'componentes_avaliacao' 
        AND column_name = 'depends_on_components'
    ) THEN
        ALTER TABLE componentes_avaliacao 
        ADD COLUMN depends_on_components JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Add check constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_calculated_has_formula'
    ) THEN
        ALTER TABLE componentes_avaliacao 
        ADD CONSTRAINT check_calculated_has_formula 
        CHECK (
            (is_calculated = false) OR 
            (is_calculated = true AND formula_expression IS NOT NULL AND formula_expression != '')
        );
    END IF;
END $$;

-- Add comments
COMMENT ON COLUMN componentes_avaliacao.is_calculated IS 'Indica se o componente é calculado automaticamente';
COMMENT ON COLUMN componentes_avaliacao.formula_expression IS 'Expressão matemática para cálculo (ex: MAC * 0.4 + EXAME * 0.6)';
COMMENT ON COLUMN componentes_avaliacao.depends_on_components IS 'Array de IDs dos componentes usados na fórmula';

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_componentes_is_calculated 
ON componentes_avaliacao(is_calculated) 
WHERE is_calculated = true;

CREATE INDEX IF NOT EXISTS idx_componentes_depends 
ON componentes_avaliacao USING gin(depends_on_components);

-- Create or replace validation function
CREATE OR REPLACE FUNCTION validate_component_dependencies()
RETURNS TRIGGER AS $$
BEGIN
    -- Only validate if component is calculated
    IF NEW.is_calculated = true THEN
        -- Check for circular dependencies
        IF NEW.depends_on_components IS NOT NULL THEN
            -- Prevent self-reference
            IF NEW.depends_on_components ? NEW.id::text THEN
                RAISE EXCEPTION 'Component cannot depend on itself';
            END IF;
            
            -- Check if any dependent component depends on this one (simple circular check)
            IF EXISTS (
                SELECT 1 FROM componentes_avaliacao
                WHERE id = ANY(SELECT jsonb_array_elements_text(NEW.depends_on_components)::uuid)
                AND is_calculated = true
                AND depends_on_components ? NEW.id::text
            ) THEN
                RAISE EXCEPTION 'Circular dependency detected';
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_validate_component_dependencies ON componentes_avaliacao;

CREATE TRIGGER trigger_validate_component_dependencies
    BEFORE INSERT OR UPDATE ON componentes_avaliacao
    FOR EACH ROW
    EXECUTE FUNCTION validate_component_dependencies();
