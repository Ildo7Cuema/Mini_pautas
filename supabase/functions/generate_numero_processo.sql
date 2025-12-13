-- ============================================
-- AUTO-GENERATE STUDENT PROCESS NUMBER
-- ============================================
-- This function generates a unique student process number
-- Format: TURMA-ANO-SEQUENCE (e.g., 10A-2024-001)

CREATE OR REPLACE FUNCTION generate_numero_processo(turma_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    turma_codigo TEXT;
    ano_lectivo INTEGER;
    contador INTEGER;
    novo_numero TEXT;
BEGIN
    -- Get turma details
    SELECT codigo_turma, ano_lectivo INTO turma_codigo, ano_lectivo
    FROM turmas
    WHERE id = turma_uuid;
    
    -- If turma not found, return error
    IF turma_codigo IS NULL THEN
        RAISE EXCEPTION 'Turma não encontrada';
    END IF;
    
    -- Count existing students in this turma
    SELECT COUNT(*) + 1 INTO contador
    FROM alunos
    WHERE turma_id = turma_uuid;
    
    -- Generate format: TURMA-ANO-SEQUENCE
    -- Example: 10A-2024-001
    novo_numero := turma_codigo || '-' || ano_lectivo || '-' || LPAD(contador::TEXT, 3, '0');
    
    -- Ensure uniqueness (in case of race conditions)
    WHILE EXISTS (SELECT 1 FROM alunos WHERE numero_processo = novo_numero) LOOP
        contador := contador + 1;
        novo_numero := turma_codigo || '-' || ano_lectivo || '-' || LPAD(contador::TEXT, 3, '0');
    END LOOP;
    
    RETURN novo_numero;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_numero_processo(UUID) TO authenticated;
