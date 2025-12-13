-- PARTE 3: Criar função helper e políticas
-- Execute esta parte depois da PARTE 2

CREATE OR REPLACE FUNCTION get_current_user_escola_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS '
DECLARE
    escola_uuid UUID;
BEGIN
    SELECT escola_id INTO escola_uuid
    FROM user_profiles
    WHERE user_id = auth.uid() AND ativo = true
    LIMIT 1;
    RETURN escola_uuid;
END;
';

GRANT EXECUTE ON FUNCTION get_current_user_escola_id() TO authenticated;

-- Políticas para escolas
CREATE POLICY "Escolas podem ver proprio registro"
    ON escolas FOR SELECT
    USING (user_id = auth.uid() OR id = get_current_user_escola_id());

CREATE POLICY "Escolas podem criar proprio registro"
    ON escolas FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Políticas para user_profiles
CREATE POLICY "Schools can view their teachers profiles"
    ON user_profiles FOR SELECT
    USING (escola_id = get_current_user_escola_id());

CREATE POLICY "Users can create own escola profile"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid() AND tipo_perfil = 'ESCOLA');

CREATE POLICY "Schools can create teacher profiles"
    ON user_profiles FOR INSERT
    WITH CHECK (tipo_perfil = 'PROFESSOR' AND escola_id = get_current_user_escola_id());

-- Políticas para turmas
CREATE POLICY "Escola pode ver suas turmas"
    ON turmas FOR SELECT
    USING (escola_id = get_current_user_escola_id());

CREATE POLICY "Escola pode criar turmas"
    ON turmas FOR INSERT
    WITH CHECK (escola_id = get_current_user_escola_id());

CREATE POLICY "Escola pode atualizar suas turmas"
    ON turmas FOR UPDATE
    USING (escola_id = get_current_user_escola_id());

CREATE POLICY "Escola pode deletar suas turmas"
    ON turmas FOR DELETE
    USING (escola_id = get_current_user_escola_id());

CREATE POLICY "Professor pode ver turmas associadas"
    ON turmas FOR SELECT
    USING (
        id IN (
            SELECT tp.turma_id 
            FROM turma_professores tp
            JOIN professores p ON p.id = tp.professor_id
            WHERE p.user_id = auth.uid()
        )
    );

