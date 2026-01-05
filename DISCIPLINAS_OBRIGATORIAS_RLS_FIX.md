# 🔧 Correção: Permissão para Disciplina Obrigatória (Perfil Escola)

## ⚠️ Problema

O perfil **ESCOLA** está a receber o erro:
```
Você não tem permissão para esta operação
```

Este erro aparece ao tentar marcar/desmarcar disciplinas como obrigatórias na página de **Detalhes e Gestão de Turma**.

## 🔍 Causa

As políticas RLS (Row Level Security) na tabela `disciplinas_obrigatorias` só permitiam acesso a **professores**, não ao perfil **ESCOLA**.

## ✅ Solução

Execute a migração SQL para corrigir as políticas.

---

## 📋 Passo a Passo

### 1. Abrir o Supabase Dashboard

1. Aceda a: **https://app.supabase.com**
2. Faça login com a sua conta
3. Selecione o seu projeto

### 2. Ir ao SQL Editor

1. No menu lateral esquerdo, clique em **"SQL Editor"**
2. Clique no botão **"New Query"** ou **"+"**

### 3. Copiar e Colar o Script SQL

Copie **TODO** o código abaixo e cole no editor SQL:

```sql
-- Migration: Fix disciplinas_obrigatorias RLS policies for ESCOLA profile
-- Date: 2026-01-05

-- ============================================
-- DROP EXISTING POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view disciplinas_obrigatorias for their turmas" ON disciplinas_obrigatorias;
DROP POLICY IF EXISTS "Users can insert disciplinas_obrigatorias for their turmas" ON disciplinas_obrigatorias;
DROP POLICY IF EXISTS "Users can update disciplinas_obrigatorias for their turmas" ON disciplinas_obrigatorias;
DROP POLICY IF EXISTS "Users can delete disciplinas_obrigatorias for their turmas" ON disciplinas_obrigatorias;

-- ============================================
-- CREATE NEW POLICIES THAT INCLUDE ESCOLA PROFILE
-- ============================================

-- SELECT policy
CREATE POLICY "Users can view disciplinas_obrigatorias for their turmas"
ON disciplinas_obrigatorias FOR SELECT
USING (
    turma_id IN (
        SELECT t.id FROM turmas t
        WHERE t.escola_id = get_current_user_escola_id()
    )
    OR
    turma_id IN (
        SELECT t.id FROM turmas t
        JOIN professores p ON t.professor_id = p.id
        WHERE p.user_id = auth.uid()
    )
);

-- INSERT policy
CREATE POLICY "Users can insert disciplinas_obrigatorias for their turmas"
ON disciplinas_obrigatorias FOR INSERT
WITH CHECK (
    turma_id IN (
        SELECT t.id FROM turmas t
        WHERE t.escola_id = get_current_user_escola_id()
    )
    OR
    turma_id IN (
        SELECT t.id FROM turmas t
        JOIN professores p ON t.professor_id = p.id
        WHERE p.user_id = auth.uid()
    )
);

-- UPDATE policy
CREATE POLICY "Users can update disciplinas_obrigatorias for their turmas"
ON disciplinas_obrigatorias FOR UPDATE
USING (
    turma_id IN (
        SELECT t.id FROM turmas t
        WHERE t.escola_id = get_current_user_escola_id()
    )
    OR
    turma_id IN (
        SELECT t.id FROM turmas t
        JOIN professores p ON t.professor_id = p.id
        WHERE p.user_id = auth.uid()
    )
);

-- DELETE policy
CREATE POLICY "Users can delete disciplinas_obrigatorias for their turmas"
ON disciplinas_obrigatorias FOR DELETE
USING (
    turma_id IN (
        SELECT t.id FROM turmas t
        WHERE t.escola_id = get_current_user_escola_id()
    )
    OR
    turma_id IN (
        SELECT t.id FROM turmas t
        JOIN professores p ON t.professor_id = p.id
        WHERE p.user_id = auth.uid()
    )
);

-- ============================================
-- VERIFY POLICIES
-- ============================================

SELECT 
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'disciplinas_obrigatorias'
ORDER BY policyname;
```

### 4. Executar o Script

1. Clique no botão **"Run"** ou pressione **Ctrl+Enter** (Windows) / **Cmd+Enter** (Mac)
2. Aguarde alguns segundos
3. Deve ver uma mensagem de sucesso e uma tabela com as políticas

### 5. Verificar o Resultado

Na parte inferior do editor, deve ver uma tabela com 4 políticas:
- `Users can delete disciplinas_obrigatorias for their turmas`
- `Users can insert disciplinas_obrigatorias for their turmas`
- `Users can update disciplinas_obrigatorias for their turmas`
- `Users can view disciplinas_obrigatorias for their turmas`

Se vir estas 4 políticas, a migração foi aplicada com sucesso! ✅

---

## 🧪 Testar a Correção

Depois de executar a migração:

1. **Volte à aplicação** (localhost:3000 ou o URL em produção)
2. **Atualize a página** (F5 ou Cmd+R)
3. Vá para **Turmas** → **Detalhes de uma Turma** → **Disciplinas**
4. Tente marcar/desmarcar uma disciplina como **Obrigatória**
5. Deve funcionar sem erro! ✅

---

## 📁 Ficheiro de Migração

O ficheiro SQL completo está em:
```
supabase/migrations/fix_disciplinas_obrigatorias_escola_rls.sql
```

---

## 📝 O Que Este Script Faz

1. **Remove políticas antigas** que só permitiam acesso a professores
2. **Cria políticas novas** que permitem acesso a:
   - **Escolas**: Podem gerir disciplinas obrigatórias de todas as turmas da sua escola
   - **Professores**: Podem gerir disciplinas obrigatórias das suas turmas

---

**Precisa de ajuda? Me avise!** 🚀
