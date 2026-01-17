-- ============================================
-- MIGRATION: Migrate Existing Components to Catalog
-- Purpose: Migrate existing data from componentes_avaliacao 
--          to the new catalog structure
-- Date: 2026-01-17
-- IMPORTANT: Run this AFTER 20260117_component_catalog_system.sql
-- ============================================

-- ============================================
-- STEP 1: Populate componentes_catalogo from existing data
-- Extract unique components per school
-- ============================================

INSERT INTO componentes_catalogo (
    escola_id,
    codigo_componente,
    nome,
    peso_padrao,
    escala_minima,
    escala_maxima,
    is_calculated,
    formula_expression,
    depends_on_codes,
    tipo_calculo,
    descricao
)
SELECT DISTINCT ON (t.escola_id, ca.codigo_componente)
    t.escola_id,
    ca.codigo_componente,
    ca.nome,
    ca.peso_percentual as peso_padrao,
    ca.escala_minima,
    ca.escala_maxima,
    COALESCE(ca.is_calculated, false),
    ca.formula_expression,
    -- Convert depends_on_components UUIDs (stored as JSONB array) to codes
    COALESCE(
        (
            SELECT array_agg(DISTINCT ca2.codigo_componente)
            FROM componentes_avaliacao ca2
            WHERE ca2.id::text IN (
                SELECT jsonb_array_elements_text(
                    CASE 
                        WHEN ca.depends_on_components IS NULL THEN '[]'::jsonb
                        WHEN jsonb_typeof(ca.depends_on_components) = 'array' THEN ca.depends_on_components
                        ELSE '[]'::jsonb
                    END
                )
            )
        ),
        '{}'::text[]
    ) as depends_on_codes,
    COALESCE(ca.tipo_calculo, 'trimestral'),
    ca.descricao
FROM componentes_avaliacao ca
JOIN disciplinas d ON ca.disciplina_id = d.id
JOIN turmas t ON d.turma_id = t.id
ORDER BY t.escola_id, ca.codigo_componente, ca.created_at DESC
ON CONFLICT (escola_id, codigo_componente) DO NOTHING;

-- ============================================
-- STEP 2: Populate disciplina_componentes from existing data
-- Create associations for each discipline-component pair
-- ============================================

INSERT INTO disciplina_componentes (
    disciplina_id,
    componente_catalogo_id,
    trimestre,
    peso_percentual,
    ordem,
    obrigatorio
)
SELECT 
    ca.disciplina_id,
    cc.id as componente_catalogo_id,
    COALESCE(ca.trimestre, 1) as trimestre,
    ca.peso_percentual,
    ca.ordem,
    ca.obrigatorio
FROM componentes_avaliacao ca
JOIN disciplinas d ON ca.disciplina_id = d.id
JOIN turmas t ON d.turma_id = t.id
JOIN componentes_catalogo cc ON cc.escola_id = t.escola_id 
    AND cc.codigo_componente = ca.codigo_componente
ON CONFLICT (disciplina_id, componente_catalogo_id, trimestre) DO NOTHING;

-- ============================================
-- STEP 3: Add new column to notas table
-- Reference disciplina_componentes instead of componentes_avaliacao
-- ============================================

-- Add new column (nullable initially for migration)
ALTER TABLE notas 
ADD COLUMN IF NOT EXISTS disciplina_componente_id UUID REFERENCES disciplina_componentes(id) ON DELETE CASCADE;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_notas_disciplina_componente ON notas(disciplina_componente_id);

-- ============================================
-- STEP 4: Migrate existing notas to reference new structure
-- ============================================

UPDATE notas n
SET disciplina_componente_id = dc.id
FROM componentes_avaliacao ca
JOIN disciplinas d ON ca.disciplina_id = d.id
JOIN turmas t ON d.turma_id = t.id
JOIN componentes_catalogo cc ON cc.escola_id = t.escola_id 
    AND cc.codigo_componente = ca.codigo_componente
JOIN disciplina_componentes dc ON dc.disciplina_id = ca.disciplina_id 
    AND dc.componente_catalogo_id = cc.id 
    AND dc.trimestre = COALESCE(ca.trimestre, 1)
WHERE n.componente_id = ca.id
AND n.disciplina_componente_id IS NULL;

-- Note: The update above handles all cases. If notas table has a trimestre column,
-- it's used via the componente_id reference to ca.trimestre which already covers it.

-- ============================================
-- VERIFICATION QUERIES (Run to check migration)
-- ============================================

-- Check catalog population
-- SELECT escola_id, COUNT(*) as total_componentes 
-- FROM componentes_catalogo 
-- GROUP BY escola_id;

-- Check associations created
-- SELECT COUNT(*) as total_associations FROM disciplina_componentes;

-- Check if all notas were migrated
-- SELECT 
--     COUNT(*) FILTER (WHERE disciplina_componente_id IS NOT NULL) as migrated,
--     COUNT(*) FILTER (WHERE disciplina_componente_id IS NULL) as not_migrated,
--     COUNT(*) as total
-- FROM notas 
-- WHERE componente_id IS NOT NULL;

-- ============================================
-- NOTE: After verifying migration is complete and successful:
-- 1. Make disciplina_componente_id NOT NULL
-- 2. Remove componente_id column
-- 3. Drop componentes_avaliacao table (optional, can keep for reference)
-- 
-- These steps should be done in a separate migration after verification:
-- 
-- ALTER TABLE notas ALTER COLUMN disciplina_componente_id SET NOT NULL;
-- ALTER TABLE notas DROP CONSTRAINT IF EXISTS unique_nota_aluno_componente;
-- ALTER TABLE notas DROP COLUMN componente_id;
-- ALTER TABLE notas ADD CONSTRAINT unique_nota_aluno_disciplina_componente 
--     UNIQUE (aluno_id, disciplina_componente_id);
-- ============================================
