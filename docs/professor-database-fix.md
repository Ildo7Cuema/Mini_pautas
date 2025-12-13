# Guia de Verificação e Correção de Dados de Professores

Este guia ajuda a diagnosticar e corrigir problemas com o login de professores.

## Problema Comum

**Sintoma**: Professor não consegue fazer login ou fica em loading infinito.

**Causa**: O registro do professor na tabela `professores` não está vinculado ao usuário em `auth.users`.

## Passo a Passo

### 1. Abrir Supabase SQL Editor

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **SQL Editor** no menu lateral

### 2. Verificar Professores Sem Vínculo

Execute esta query para ver professores sem `user_id`:

```sql
SELECT 
    id,
    nome_completo,
    email,
    user_id,
    ativo
FROM professores
WHERE user_id IS NULL
ORDER BY created_at DESC;
```

**O que procurar**: Se houver professores listados, eles não estão vinculados a usuários.

### 3. Verificar Usuários Auth

Execute esta query para ver se existe um usuário auth com o mesmo email:

```sql
SELECT 
    au.id as auth_user_id,
    au.email,
    p.id as professor_id,
    p.nome_completo
FROM auth.users au
LEFT JOIN professores p ON p.email = au.email
WHERE au.email = 'EMAIL_DO_PROFESSOR_AQUI';
```

**Substitua** `EMAIL_DO_PROFESSOR_AQUI` pelo email real.

### 4. Vincular Manualmente (se necessário)

Se o professor existe mas não está vinculado:

```sql
UPDATE professores
SET user_id = 'USER_ID_AQUI'
WHERE email = 'EMAIL_DO_PROFESSOR_AQUI';
```

**Substitua**:
- `USER_ID_AQUI` pelo ID do usuário da query anterior
- `EMAIL_DO_PROFESSOR_AQUI` pelo email do professor

### 5. Vincular Todos Automaticamente

Para vincular **todos** os professores de uma vez:

```sql
UPDATE professores p
SET user_id = au.id
FROM auth.users au
WHERE au.email = p.email
  AND p.user_id IS NULL
  AND p.ativo = true;
```

⚠️ **ATENÇÃO**: Isso vincula TODOS os professores. Verifique antes!

### 6. Verificar Trigger de Auto-Link

O trigger deve vincular automaticamente novos usuários. Verifique se existe:

```sql
SELECT trigger_name
FROM information_schema.triggers
WHERE trigger_name = 'auto_link_professor_on_user_creation';
```

Se não retornar nada, o trigger não existe. Execute o script completo em `verify_professor_data.sql` seção 8.

## Solução Rápida

Se você tem um professor específico que não consegue fazer login:

1. **Pegue o email** do professor
2. **Execute**:
   ```sql
   -- Ver dados
   SELECT * FROM professores WHERE email = 'professor@email.com';
   SELECT * FROM auth.users WHERE email = 'professor@email.com';
   
   -- Vincular
   UPDATE professores p
   SET user_id = au.id
   FROM auth.users au
   WHERE au.email = 'professor@email.com'
     AND p.email = 'professor@email.com';
   ```

3. **Peça ao professor** para fazer logout e login novamente

## Verificação Final

Após corrigir, execute:

```sql
SELECT 
    COUNT(*) as total_professores,
    COUNT(user_id) as professores_vinculados,
    COUNT(*) - COUNT(user_id) as professores_sem_vinculo
FROM professores
WHERE ativo = true;
```

**Resultado esperado**: `professores_sem_vinculo` deve ser **0**.

## Prevenção

Para evitar este problema no futuro:

1. ✅ Certifique-se de que o trigger está ativo (seção 6)
2. ✅ Sempre use o fluxo de convite (botão de link na página de Professores)
3. ✅ Não crie usuários manualmente no Supabase Auth
