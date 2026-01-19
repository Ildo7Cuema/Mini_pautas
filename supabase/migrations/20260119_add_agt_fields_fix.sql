-- ============================================
-- FIX MIGRATION: Adicionar campos AGT em tabela existente
-- Date: 2026-01-19
-- ============================================

DO $$
BEGIN
    -- Adicionar estado se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos_propinas' AND column_name = 'estado') THEN
        ALTER TABLE pagamentos_propinas ADD COLUMN estado TEXT NOT NULL DEFAULT 'valido' CHECK (estado IN ('valido', 'anulado'));
    END IF;

    -- Adicionar motivo_anulacao se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos_propinas' AND column_name = 'motivo_anulacao') THEN
        ALTER TABLE pagamentos_propinas ADD COLUMN motivo_anulacao TEXT;
    END IF;

    -- Adicionar data_anulacao se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos_propinas' AND column_name = 'data_anulacao') THEN
        ALTER TABLE pagamentos_propinas ADD COLUMN data_anulacao TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Adicionar anulado_por se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos_propinas' AND column_name = 'anulado_por') THEN
        ALTER TABLE pagamentos_propinas ADD COLUMN anulado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    -- Adicionar hash se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos_propinas' AND column_name = 'hash') THEN
        ALTER TABLE pagamentos_propinas ADD COLUMN hash TEXT DEFAULT 'PENDING';
    END IF;

    -- Adicionar hash_control se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos_propinas' AND column_name = 'hash_control') THEN
        ALTER TABLE pagamentos_propinas ADD COLUMN hash_control TEXT DEFAULT 'XXXX';
    END IF;

    -- Adicionar sistema_certificado se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos_propinas' AND column_name = 'sistema_certificado') THEN
        ALTER TABLE pagamentos_propinas ADD COLUMN sistema_certificado TEXT DEFAULT 'Processado por programa válido n31.1/AGT20';
    END IF;

    -- Adicionar tipo_documento se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos_propinas' AND column_name = 'tipo_documento') THEN
        ALTER TABLE pagamentos_propinas ADD COLUMN tipo_documento TEXT DEFAULT 'RG';
    END IF;
END $$;
