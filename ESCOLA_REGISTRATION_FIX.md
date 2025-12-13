# 🔧 Aplicar Correção de Registro de Escola

## Problema Resolvido

Este migration corrige o erro: **"Erro ao criar registro da escola. Por favor, contacte o suporte."**

Causa: Políticas RLS nas tabelas `escolas` e `user_profiles` estavam causando recursão infinita.

## Como Aplicar a Correção

### Via Supabase Dashboard (Recomendado)

1. Acesse [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá para **SQL Editor**
4. Copie o conteúdo de `supabase/migrations/005_fix_escola_registration_rls.sql`
5. Cole no editor e execute (Cmd+Enter)

### Opção 2: Via Script Bash

```bash
./apply_escola_registration_fix.sh
```

## O Que Foi Corrigido

A política RLS (Row Level Security) da tabela `escolas` estava bloqueando novos registros durante o cadastro. A nova política permite que usuários autenticados criem seu primeiro registro de escola.

### Antes (Problemático)

```sql
CREATE POLICY "Escolas podem criar próprio registro"
    ON escolas FOR INSERT
    WITH CHECK (user_id = auth.uid());
```

### Depois (Corrigido)

```sql
CREATE POLICY "Escolas podem criar próprio registro"
    ON escolas FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND user_id = auth.uid()
    );
```

**Nota:** A prevenção de duplicatas é feita pelo índice único em `user_id` na tabela.

## Testar a Correção

Após aplicar o migration:

1. Acesse a página de cadastro de escola
2. Preencha os dados da escola e do responsável
3. Submeta o formulário
4. ✅ O cadastro deve ser concluído com sucesso

## Arquivos Criados

- `supabase/migrations/005_fix_escola_registration_rls.sql` - Migration SQL
- `apply_escola_registration_fix.sh` - Script para aplicar
- `apply_migration.mjs` - Script Node.js alternativo

## Segurança

A nova política mantém a segurança:
- ✅ Requer autenticação
- ✅ Usuário só pode criar sua própria escola
- ✅ Previne registros duplicados
