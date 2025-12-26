# Instruções Adicionais: Recriar a View vw_mini_pauta

Após aplicar a migração que altera `ano_lectivo` de INTEGER para TEXT, você precisará recriar a view `vw_mini_pauta`.

## Passo 1: Obter a Definição Original da View

Antes de aplicar a migração, execute este SQL para ver a definição da view:

```sql
SELECT pg_get_viewdef('vw_mini_pauta', true);
```

**Copie o resultado** - você precisará dele para recriar a view.

## Passo 2: Aplicar a Migração

Execute o arquivo de migração:
```sql
-- Cole o conteúdo de 20251226_change_ano_lectivo_to_text.sql
```

## Passo 3: Recriar a View

Depois que a migração for aplicada com sucesso, recrie a view usando a definição que você copiou no Passo 1.

A view provavelmente tem uma definição similar a esta (ajuste conforme necessário):

```sql
CREATE OR REPLACE VIEW vw_mini_pauta AS
SELECT 
    t.id as turma_id,
    t.nome as turma_nome,
    t.ano_lectivo,  -- Agora é TEXT em vez de INTEGER
    t.trimestre,
    -- ... resto das colunas
FROM turmas t
-- ... resto da query
;
```

## Alternativa: Migração em Uma Etapa

Se preferir, você pode executar tudo de uma vez:

```sql
BEGIN;

-- 1. Salvar definição da view
CREATE TEMP TABLE temp_view_def AS 
SELECT pg_get_viewdef('vw_mini_pauta', true) as definition;

-- 2. Dropar a view
DROP VIEW IF EXISTS vw_mini_pauta CASCADE;

-- 3. Alterar a coluna
ALTER TABLE turmas 
ALTER COLUMN ano_lectivo TYPE TEXT USING ano_lectivo::TEXT;

ALTER TABLE propinas_config 
ALTER COLUMN ano_lectivo TYPE TEXT USING ano_lectivo::TEXT;

-- 4. Recriar a view (cole a definição original aqui)
-- CREATE OR REPLACE VIEW vw_mini_pauta AS ...

COMMIT;
```

## Verificação

Após recriar a view, verifique se está funcionando:

```sql
SELECT * FROM vw_mini_pauta LIMIT 5;
```
