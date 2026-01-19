-- ============================================
-- FIX MIGRATION: Remover restrição de unicidade para permitir pagamentos parciais
-- Date: 2026-01-19
-- ============================================

DO $$
BEGIN
    -- Remover a constraint unique_pagamento_aluno_mes_ano se existir
    -- Isso permite múltiplos pagamentos para o mesmo aluno/mês/ano (pagamentos parciais)
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'unique_pagamento_aluno_mes_ano'
    ) THEN
        ALTER TABLE pagamentos_propinas DROP CONSTRAINT unique_pagamento_aluno_mes_ano;
    END IF;
END $$;
