# Como Aplicar a Migração de Frequência e Exames

## Visão Geral

Esta migração adiciona campos necessários à tabela `alunos` para suportar as regras oficiais de avaliação do Sistema de Ensino em Angola.

## Campos Adicionados

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `frequencia_anual` | NUMERIC(5,2) | Percentual de frequência anual (0-100%). Mínimo 66.67% para transitar |
| `tipo_exame` | TEXT | Tipo de exame: 'Nacional', 'Extraordinário' ou 'Recurso' |
| `motivo_retencao` | TEXT | Motivo detalhado quando o aluno não transita |
| `observacao_transicao` | TEXT | Observação padronizada sobre a transição |
| `matricula_condicional` | BOOLEAN | Indica se está em matrícula condicional (7ª e 8ª classes) |

## Pré-requisitos

- Acesso ao Supabase CLI ou Dashboard
- Backup da base de dados (recomendado)
- Permissões de administrador

> [!NOTE]
> **Versão Corrigida**
> 
> A migração foi corrigida para remover o registo de auditoria que causava erro de CHECK constraint. A tabela `auditoria` só aceita 'INSERT', 'UPDATE', 'DELETE' na coluna `operacao`.

---

## Opção 1: Aplicar via Supabase CLI (Recomendado)

### Passo 1: Verificar Conexão

```bash
# Verificar se está conectado ao projeto correto
npx supabase status
```

### Passo 2: Aplicar Migração

```bash
# Aplicar a migração
npx supabase db push

# OU aplicar migração específica
npx supabase migration up --file 20251215_add_attendance_and_exam_fields.sql
```

### Passo 3: Verificar Aplicação

```bash
# Verificar se as colunas foram adicionadas
npx supabase db diff
```

---

## Opção 2: Aplicar via Supabase Dashboard

### Passo 1: Acessar SQL Editor

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Navegue para **SQL Editor** no menu lateral

### Passo 2: Executar Script

1. Abra o arquivo `supabase/migrations/20251215_add_attendance_and_exam_fields.sql`
2. Copie todo o conteúdo
3. Cole no SQL Editor
4. Clique em **Run** (ou pressione Ctrl+Enter)

### Passo 3: Verificar Resultado

Você deve ver a mensagem:
```
Migration successful: All columns added to alunos table
```

---

## Opção 3: Aplicar via Script Node.js

### Passo 1: Criar Script de Aplicação

Já existe um script em `apply_migration.mjs`. Execute:

```bash
node apply_migration.mjs supabase/migrations/20251215_add_attendance_and_exam_fields.sql
```

---

## Verificação Pós-Migração

### 1. Verificar Estrutura da Tabela

Execute no SQL Editor:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'alunos'
  AND column_name IN ('frequencia_anual', 'tipo_exame', 'motivo_retencao', 'observacao_transicao', 'matricula_condicional')
ORDER BY column_name;
```

Resultado esperado:
```
column_name              | data_type | is_nullable | column_default
-------------------------|-----------|-------------|---------------
frequencia_anual         | numeric   | YES         | NULL
matricula_condicional    | boolean   | YES         | false
motivo_retencao          | text      | YES         | NULL
observacao_transicao     | text      | YES         | NULL
tipo_exame               | text      | YES         | NULL
```

### 2. Verificar Constraints

```sql
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'alunos'::regclass
  AND conname LIKE '%frequencia%' OR conname LIKE '%tipo_exame%';
```

### 3. Verificar Trigger

```sql
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'alunos'
  AND trigger_name = 'trigger_validate_student_transition';
```

### 4. Testar Validação Automática

```sql
-- Teste 1: Inserir aluno com frequência baixa (deve definir motivo automaticamente)
INSERT INTO alunos (
    turma_id, 
    nome_completo, 
    numero_processo, 
    frequencia_anual
)
VALUES (
    (SELECT id FROM turmas LIMIT 1),
    'Teste Frequência Baixa',
    'TEST-FREQ-001',
    50.00
)
RETURNING frequencia_anual, motivo_retencao, observacao_transicao;

-- Resultado esperado: motivo_retencao e observacao_transicao devem estar preenchidos

-- Teste 2: Inserir aluno em matrícula condicional (deve definir tipo_exame)
INSERT INTO alunos (
    turma_id,
    nome_completo,
    numero_processo,
    matricula_condicional
)
VALUES (
    (SELECT id FROM turmas LIMIT 1),
    'Teste Matrícula Condicional',
    'TEST-COND-001',
    true
)
RETURNING matricula_condicional, tipo_exame;

-- Resultado esperado: tipo_exame deve ser 'Extraordinário'

-- Limpar testes
DELETE FROM alunos WHERE numero_processo LIKE 'TEST-%';
```

---

## Rollback (Se Necessário)

Se precisar reverter a migração:

```sql
-- Remover trigger
DROP TRIGGER IF EXISTS trigger_validate_student_transition ON alunos;
DROP FUNCTION IF EXISTS validate_student_transition();

-- Remover índices
DROP INDEX IF EXISTS idx_alunos_frequencia;
DROP INDEX IF EXISTS idx_alunos_matricula_condicional;
DROP INDEX IF EXISTS idx_alunos_tipo_exame;

-- Remover colunas
ALTER TABLE alunos
DROP COLUMN IF EXISTS frequencia_anual,
DROP COLUMN IF EXISTS tipo_exame,
DROP COLUMN IF EXISTS motivo_retencao,
DROP COLUMN IF EXISTS observacao_transicao,
DROP COLUMN IF EXISTS matricula_condicional;
```

---

## Próximos Passos

Após aplicar a migração com sucesso:

1. ✅ Migração aplicada
2. ⏳ Testar funcionalidade de Pauta-Geral com frequência
3. ⏳ Atualizar interface para permitir edição de frequência
4. ⏳ Gerar relatórios com novos campos
5. ⏳ Treinar utilizadores sobre novos campos

---

## Troubleshooting

### Erro: "column already exists"

Se receber erro de coluna já existente:

```sql
-- Verificar se as colunas já existem
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'alunos' 
  AND column_name IN ('frequencia_anual', 'tipo_exame', 'motivo_retencao', 'observacao_transicao', 'matricula_condicional');
```

Se as colunas já existirem, a migração já foi aplicada.

### Erro: "permission denied"

Certifique-se de que está autenticado com permissões de administrador:

```bash
npx supabase login
```

### Erro: "relation does not exist"

Verifique se a tabela `alunos` existe:

```sql
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'alunos'
);
```

---

## Suporte

Para questões ou problemas:
1. Consulte [REGRAS_AVALIACAO_ANGOLA.md](file:///Users/user/.gemini/antigravity/playground/dark-hubble/.agent/REGRAS_AVALIACAO_ANGOLA.md)
2. Revise o [Plano de Implementação](file:///Users/user/.gemini/antigravity/brain/44d8ff84-1cf1-44b6-8d44-4c22412a7194/implementation_plan.md)
3. Verifique os logs do Supabase
