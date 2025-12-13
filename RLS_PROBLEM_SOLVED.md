# ✅ Problema RLS Resolvido

## 🎯 Problema Original

O Dashboard mostrava erro de permissão ao tentar aceder aos dados das turmas:
```
Sem permissão para acessar dados. Verifique se seu perfil está configurado corretamente.
```

## 🔍 Diagnóstico

Após investigação detalhada, descobrimos que havia **múltiplos problemas**:

### 1. Recursão Infinita nas Políticas RLS
- **Erro**: `infinite recursion detected in policy for relation "turmas"`
- **Causa**: Políticas SELECT duplicadas ou com JOINs complexos que causavam recursão circular
- **Exemplo**: Política que fazia JOIN com `turma_professores` → `professores`, e professores também tinha RLS que consultava turmas

### 2. Função Auxiliar Não Funcionava
- **Problema**: `get_current_user_escola_id()` retornava `null` no contexto da aplicação
- **Causa**: A função não conseguia obter o `auth.uid()` corretamente em alguns contextos

### 3. Políticas Duplicadas
- **Problema**: Existiam múltiplas políticas SELECT para a mesma tabela
- **Causa**: Migrações anteriores não removeram políticas antigas antes de criar novas

## ✅ Solução Final

### Políticas RLS Simplificadas

Criámos políticas **simples** que:
- ✅ **NÃO usam funções auxiliares** - Consultam diretamente `user_profiles`
- ✅ **NÃO fazem JOINs complexos** - Evitam recursão
- ✅ **Usam EXISTS** em vez de IN - Mais eficiente
- ✅ **Comparam diretamente** `turmas.escola_id` com `user_profiles.escola_id`

### Código da Solução

```sql
-- SELECT: Permitir acesso baseado em escola_id
CREATE POLICY "turmas_select_simple"
    ON turmas FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
              AND escola_id = turmas.escola_id 
              AND ativo = true
        )
    );

-- INSERT: Permitir criar turmas (apenas ESCOLA)
CREATE POLICY "turmas_insert_simple"
    ON turmas FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
              AND escola_id = turmas.escola_id 
              AND tipo_perfil = 'ESCOLA'
              AND ativo = true
        )
    );

-- UPDATE: Permitir atualizar turmas
CREATE POLICY "turmas_update_simple"
    ON turmas FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
              AND escola_id = turmas.escola_id 
              AND ativo = true
        )
    );

-- DELETE: Permitir deletar turmas (apenas ESCOLA)
CREATE POLICY "turmas_delete_simple"
    ON turmas FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
              AND escola_id = turmas.escola_id 
              AND tipo_perfil = 'ESCOLA'
              AND ativo = true
        )
    );
```

## 📊 Resultados

Após aplicar a solução:
- ✅ Dashboard carrega corretamente
- ✅ Mostra 0 turmas (correto, pois não há turmas criadas)
- ✅ Sem erros de permissão
- ✅ Sem recursão infinita
- ✅ RLS ativado e funcionando

## 🔧 Ficheiros Criados

1. **`008_fix_turmas_rls_final.sql`** - Migração final com a solução
2. **`007_diagnostic_rls.sql`** - Script de diagnóstico
3. **`RLS_PROBLEM_SOLVED.md`** - Este documento

## 📝 Lições Aprendidas

### ❌ O Que NÃO Fazer

1. **Não criar políticas com JOINs complexos** - Causa recursão
2. **Não ter múltiplas políticas SELECT** - Pode causar conflitos
3. **Não depender de funções auxiliares complexas** - Podem falhar em certos contextos
4. **Não usar IN com subqueries complexas** - Pode ser lento e causar recursão

### ✅ O Que Fazer

1. **Usar EXISTS** em vez de IN - Mais eficiente
2. **Manter políticas simples** - Consultar apenas 1-2 tabelas
3. **Consultar diretamente user_profiles** - Evitar funções auxiliares
4. **Testar com RLS desativado primeiro** - Para isolar o problema
5. **Usar logs detalhados** - Para debug

## 🚀 Próximos Passos

Agora que o RLS funciona:

1. ✅ Criar turmas
2. ✅ Adicionar alunos
3. ✅ Lançar notas
4. ✅ Gerar relatórios

## 🔗 Referências

- Migração final: `supabase/migrations/008_fix_turmas_rls_final.sql`
- Script de diagnóstico: `supabase/migrations/007_diagnostic_rls.sql`
- Documentação Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
