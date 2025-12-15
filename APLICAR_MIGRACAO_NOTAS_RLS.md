# 🔧 Como Aplicar a Migração - Fix Escola Notas RLS

## ⚠️ Problema Atual

Ao tentar lançar notas na página administrativa, está a receber este erro:
```
new row violates row-level security policy for table "notas"
code: '42501'
```

Isto acontece porque **faltam políticas RLS** que permitam escolas inserir e atualizar notas.

## ✅ Solução: Executar a Migração SQL

Precisa executar o script SQL que adiciona as políticas necessárias. Siga estes passos:

---

## 📋 Passo a Passo

### 1. Abrir o Supabase Dashboard

1. Vá para: **https://app.supabase.com**
2. Faça login com a sua conta
3. Selecione o seu projeto

### 2. Ir ao SQL Editor

1. No menu lateral esquerdo, clique em **"SQL Editor"**
2. Clique no botão **"New Query"** (Nova Consulta) ou **"+"**

### 3. Copiar e Colar o Script SQL

Copie **TODO** o código abaixo e cole no editor SQL:

```sql
-- ============================================
-- MIGRATION: Fix Escola Notas INSERT/UPDATE Policies
-- Date: 2025-12-15
-- Purpose: Allow schools to insert and update grades for their students
-- ============================================

-- ============================================
-- 1. ADD ESCOLA INSERT POLICY FOR NOTAS
-- ============================================

-- Remove old policy if exists
DROP POLICY IF EXISTS "Escola pode lançar notas" ON notas;

-- Create policy for schools to insert grades
CREATE POLICY "Escola pode lançar notas"
    ON notas FOR INSERT
    WITH CHECK (
        -- Check that the turma belongs to the school
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
        AND
        -- Check that the student belongs to the turma
        aluno_id IN (
            SELECT id FROM alunos WHERE turma_id = notas.turma_id
        )
        AND
        -- Check that the componente belongs to a disciplina in the turma
        componente_id IN (
            SELECT ca.id 
            FROM componentes_avaliacao ca
            JOIN disciplinas d ON d.id = ca.disciplina_id
            WHERE d.turma_id = notas.turma_id
        )
    );

-- ============================================
-- 2. ADD ESCOLA UPDATE POLICY FOR NOTAS
-- ============================================

-- Remove old policy if exists
DROP POLICY IF EXISTS "Escola pode atualizar notas" ON notas;

-- Create policy for schools to update grades
CREATE POLICY "Escola pode atualizar notas"
    ON notas FOR UPDATE
    USING (
        -- Check that the turma belongs to the school
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    )
    WITH CHECK (
        -- Check that the turma belongs to the school
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );

-- ============================================
-- 3. ADD ESCOLA DELETE POLICY FOR NOTAS (Optional)
-- ============================================

-- Remove old policy if exists
DROP POLICY IF EXISTS "Escola pode deletar notas" ON notas;

-- Create policy for schools to delete grades
CREATE POLICY "Escola pode deletar notas"
    ON notas FOR DELETE
    USING (
        -- Check that the turma belongs to the school
        turma_id IN (
            SELECT id FROM turmas 
            WHERE escola_id IN (
                SELECT escola_id FROM user_profiles 
                WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
            )
        )
    );

-- ============================================
-- 4. VERIFY POLICIES WERE CREATED
-- ============================================

SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'notas' 
    AND policyname LIKE '%Escola%'
ORDER BY policyname;
```

### 4. Executar o Script

1. Depois de colar o código, clique no botão **"Run"** (Executar) ou pressione **Ctrl+Enter**
2. Aguarde alguns segundos
3. Deve ver uma mensagem de sucesso e uma tabela com as políticas criadas

### 5. Verificar o Resultado

Na parte inferior do editor, deve ver uma tabela mostrando as políticas criadas:
- `Escola pode deletar notas` (DELETE)
- `Escola pode atualizar notas` (UPDATE)
- `Escola pode lançar notas` (INSERT)

Se vir estas 3 políticas, significa que a migração foi aplicada com sucesso! ✅

---

## 🧪 Testar a Correção

Depois de executar a migração:

1. **Volte à aplicação** (localhost:3000 ou localhost:5173)
2. **Atualize a página** (F5 ou Cmd+R)
3. **Vá para a página de Lançamento de Notas**
4. **Selecione**:
   - Uma turma
   - Uma disciplina
   - Um componente
   - Um trimestre
5. **Lance algumas notas** para os alunos
6. **Clique em "Salvar Notas"**
7. Deve ver a mensagem: **"X notas salvas com sucesso!"** ✅

---

## ❓ Se Houver Problemas

### Erro ao Executar o Script

Se aparecer algum erro ao executar o script:
1. Copie a mensagem de erro completa
2. Partilhe comigo para eu ajudar

### Ainda Mostra Erro de RLS

Se depois de executar ainda mostrar erro:
1. Faça **logout** da aplicação
2. Faça **login novamente**
3. Tente lançar notas novamente

---

## 📝 O Que Este Script Faz

1. **Remove políticas antigas** (se existirem)
2. **Cria política INSERT** - permite escolas lançar novas notas
3. **Cria política UPDATE** - permite escolas atualizar notas existentes
4. **Cria política DELETE** - permite escolas deletar notas (se necessário)
5. **Verifica** se as políticas foram criadas corretamente

## 🎯 Resumo

✅ **Copie o código SQL acima**
✅ **Cole no SQL Editor do Supabase**
✅ **Clique em Run**
✅ **Atualize a página da aplicação**
✅ **Lance notas - deve funcionar!**

---

**Precisa de ajuda com algum passo? Me avise!** 🚀
