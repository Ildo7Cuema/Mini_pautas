# 🔧 Como Aplicar a Migração das Políticas RLS

## ⚠️ Problema Atual

Está a receber este erro:
```
Sem permissão para acessar dados. Verifique se seu perfil está configurado corretamente.
```

Isto acontece porque as **políticas RLS antigas** ainda estão ativas na base de dados e não funcionam com a estrutura atual.

## ✅ Solução: Executar a Migração SQL

Precisa executar o script SQL que corrige as políticas. Siga estes passos:

---

## 📋 Passo a Passo

### 1. Abrir o Supabase Dashboard

1. Vá para: **https://app.supabase.com**
2. Faça login com a sua conta
3. Selecione o seu projeto (deve aparecer na lista)

### 2. Ir ao SQL Editor

1. No menu lateral esquerdo, procure por **"SQL Editor"**
2. Clique em **SQL Editor**
3. Clique no botão **"New Query"** (Nova Consulta) ou **"+"**

### 3. Copiar e Colar o Script SQL

Copie **TODO** o código abaixo e cole no editor SQL:

```sql
-- ============================================
-- CONSOLIDATED MIGRATION: Fix Turmas RLS Policies
-- Purpose: Fix permission errors when escola users try to access turmas
-- Issue: Old policies from migration 003 are still active and don't work with new user_profiles structure
-- ============================================

-- STEP 1: Drop old turmas policies
DROP POLICY IF EXISTS "Escola pode ver suas turmas" ON turmas;
DROP POLICY IF EXISTS "Escola pode criar turmas" ON turmas;
DROP POLICY IF EXISTS "Escola pode atualizar suas turmas" ON turmas;
DROP POLICY IF EXISTS "Escola pode deletar suas turmas" ON turmas;
DROP POLICY IF EXISTS "Professor pode ver turmas associadas" ON turmas;

-- STEP 2: Ensure get_current_user_escola_id() function exists
CREATE OR REPLACE FUNCTION get_current_user_escola_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    escola_uuid UUID;
BEGIN
    SELECT escola_id INTO escola_uuid
    FROM user_profiles
    WHERE user_id = auth.uid() AND ativo = true
    LIMIT 1;
    RETURN escola_uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION get_current_user_escola_id() TO authenticated;

-- STEP 3: Create new turmas policies using the helper function
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

-- STEP 4: Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'turmas'
ORDER BY policyname;
```

### 4. Executar o Script

1. Depois de colar o código, clique no botão **"Run"** (Executar) ou pressione **Ctrl+Enter**
2. Aguarde alguns segundos
3. Deve ver uma mensagem de sucesso e uma tabela com as políticas criadas

### 5. Verificar o Resultado

Na parte inferior do editor, deve ver uma tabela mostrando as políticas criadas:
- `Escola pode criar turmas`
- `Escola pode deletar suas turmas`
- `Escola pode ver suas turmas`
- `Escola pode atualizar suas turmas`
- `Professor pode ver turmas associadas`

Se vir estas 5 políticas, significa que a migração foi aplicada com sucesso! ✅

---

## 🧪 Testar a Correção

Depois de executar a migração:

1. **Volte à aplicação** (localhost:3000)
2. **Atualize a página** (F5 ou Cmd+R)
3. O Dashboard deve agora carregar e mostrar:
   - ✅ Total de turmas
   - ✅ Total de alunos
   - ✅ Lista de turmas recentes
   - ✅ Sem erros de permissão!

---

## ❓ Se Houver Problemas

### Erro ao Executar o Script

Se aparecer algum erro ao executar o script:
1. Copie a mensagem de erro completa
2. Partilhe comigo para eu ajudar

### Ainda Mostra Erro de Permissão

Se depois de executar ainda mostrar erro:
1. Faça **logout** da aplicação
2. Faça **login novamente**
3. Tente aceder ao Dashboard

### Não Consegue Aceder ao Supabase

Se não conseguir aceder ao Supabase Dashboard:
1. Verifique se tem as credenciais corretas
2. Verifique o ficheiro `.env.local` para confirmar o URL do projeto

---

## 📝 O Que Este Script Faz

1. **Remove políticas antigas** que não funcionam
2. **Cria/atualiza a função auxiliar** `get_current_user_escola_id()`
3. **Cria políticas novas** que funcionam corretamente
4. **Verifica** se as políticas foram criadas

## 🎯 Resumo

✅ **Copie o código SQL acima**
✅ **Cole no SQL Editor do Supabase**
✅ **Clique em Run**
✅ **Atualize a página da aplicação**
✅ **O Dashboard deve funcionar!**

---

**Precisa de ajuda com algum passo? Me avise!** 🚀
