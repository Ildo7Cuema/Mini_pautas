# Mini-Pautas - Guia de Início Rápido

## 🚀 Setup Inicial (15 minutos)

### Passo 1: Configurar Supabase (5 min)

1. **Acesse** [https://supabase.com](https://supabase.com) e faça login
2. **Crie um novo projeto**:
   - Nome: `mini-pautas`
   - Database Password: (escolha uma senha forte)
   - Region: `Europe West (London)` ou mais próxima de Angola
3. **Aguarde** a criação do projeto (~2 minutos)

### Passo 2: Aplicar Schema do Banco de Dados (3 min)

1. No dashboard do Supabase, vá em **SQL Editor**
2. Clique em **New Query**
3. **Copie todo o conteúdo** do arquivo `supabase/schema.sql`
4. **Cole** no editor SQL
5. Clique em **Run** (canto inferior direito)
6. **Verifique** se todas as tabelas foram criadas:
   - Vá em **Table Editor**
   - Deve ver 12 tabelas: escolas, professores, turmas, alunos, etc.

### Passo 3: Obter Chaves da API (2 min)

1. No dashboard, vá em **Settings** → **API**
2. **Copie** os seguintes valores:
   - **Project URL**: `https://[seu-projeto].supabase.co`
   - **anon public**: Chave pública (começa com `eyJ...`)
   - **service_role**: Chave privada (NUNCA compartilhe!)

### Passo 4: Configurar Projeto Local (5 min)

```bash
# 1. Navegue até o diretório do projeto
cd /Users/user/.gemini/antigravity/playground/dark-hubble

# 2. Instale as dependências
npm install

# 3. Crie o arquivo de ambiente
cp .env.example .env.local

# 4. Edite .env.local com suas chaves
# Use seu editor preferido (nano, vim, VSCode, etc.)
nano .env.local
```

**Conteúdo do `.env.local`:**
```bash
VITE_SUPABASE_URL=https://[seu-projeto].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ... (sua chave anon)
```

```bash
# 5. Inicie o servidor de desenvolvimento
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador!

---

## 🎯 Criar Primeiro Usuário Professor

### Opção A: Via Supabase Dashboard (Recomendado)

1. No dashboard do Supabase, vá em **Authentication** → **Users**
2. Clique em **Add User** → **Create new user**
3. Preencha:
   - **Email**: `professor@escola.ao`
   - **Password**: `senha123` (ou outra senha)
   - **Auto Confirm User**: ✅ Marque esta opção
4. Clique em **Create User**
5. **Copie o User ID** (UUID) que aparece

### Criar Registro de Professor

1. Vá em **SQL Editor** → **New Query**
2. Execute este SQL (substitua os valores):

```sql
-- 1. Criar escola
INSERT INTO escolas (nome, codigo_escola, provincia, municipio)
VALUES ('Escola Piloto', 'EP001', 'Luanda', 'Luanda')
RETURNING id;

-- Copie o ID da escola retornado acima

-- 2. Criar professor (substitua os UUIDs)
INSERT INTO professores (
  escola_id,
  user_id,
  nome_completo,
  numero_agente,
  email,
  especialidade,
  ativo
) VALUES (
  '[UUID-da-escola]',  -- Cole o ID da escola aqui
  '[UUID-do-user]',    -- Cole o User ID aqui
  'Professor João Silva',
  'AG001',
  'professor@escola.ao',
  'Matemática',
  true
);
```

---

## 📝 Criar Primeira Turma e Testar

### 1. Fazer Login

1. Acesse [http://localhost:3000](http://localhost:3000)
2. Login com:
   - Email: `professor@escola.ao`
   - Senha: `senha123`

### 2. Criar Turma (Via SQL - Temporário)

Por enquanto, vamos criar via SQL. Execute no SQL Editor:

```sql
-- Obter ID do professor
SELECT id FROM professores WHERE email = 'professor@escola.ao';

-- Criar turma (substitua o professor_id)
INSERT INTO turmas (
  escola_id,
  professor_id,
  nome,
  codigo_turma,
  ano_lectivo,
  trimestre,
  nivel_ensino,
  sala,
  turno,
  capacidade_maxima
) VALUES (
  (SELECT escola_id FROM professores WHERE email = 'professor@escola.ao'),
  '[UUID-do-professor]',
  '10ª Classe A',
  '10A-2025-T1',
  2025,
  1,
  '10ª Classe',
  5,
  'manhã',
  40
) RETURNING id;
```

### 3. Adicionar Alunos de Teste

```sql
-- Obter ID da turma
SELECT id FROM turmas WHERE codigo_turma = '10A-2025-T1';

-- Adicionar 5 alunos de teste
INSERT INTO alunos (turma_id, nome_completo, numero_processo, genero, ativo)
VALUES 
  ('[UUID-da-turma]', 'Ana Costa', 'A001', 'F', true),
  ('[UUID-da-turma]', 'Bruno Silva', 'A002', 'M', true),
  ('[UUID-da-turma]', 'Carlos Mendes', 'A003', 'M', true),
  ('[UUID-da-turma]', 'Diana Santos', 'A004', 'F', true),
  ('[UUID-da-turma]', 'Eduardo Lima', 'A005', 'M', true);
```

### 4. Criar Disciplina

```sql
INSERT INTO disciplinas (
  professor_id,
  turma_id,
  nome,
  codigo_disciplina,
  carga_horaria
) VALUES (
  '[UUID-do-professor]',
  '[UUID-da-turma]',
  'Matemática',
  'MAT',
  5
) RETURNING id;
```

### 5. Configurar Componentes de Avaliação

```sql
-- Obter ID da disciplina
SELECT id FROM disciplinas WHERE codigo_disciplina = 'MAT';

-- Criar componentes
INSERT INTO componentes_avaliacao (
  disciplina_id,
  turma_id,
  nome,
  codigo_componente,
  peso_percentual,
  escala_minima,
  escala_maxima,
  obrigatorio,
  ordem
) VALUES 
  ('[UUID-disciplina]', '[UUID-turma]', 'Primeira Prova', 'p1', 30, 0, 20, true, 1),
  ('[UUID-disciplina]', '[UUID-turma]', 'Segunda Prova', 'p2', 30, 0, 20, true, 2),
  ('[UUID-disciplina]', '[UUID-turma]', 'Trabalho', 'trabalho', 40, 0, 20, true, 3);
```

### 6. Criar Fórmula

```sql
INSERT INTO formulas (
  turma_id,
  disciplina_id,
  expressao,
  componentes_usados,
  validada,
  mensagem_validacao
) VALUES (
  '[UUID-turma]',
  '[UUID-disciplina]',
  '0.3*p1 + 0.3*p2 + 0.4*trabalho',
  '["p1", "p2", "trabalho"]'::jsonb,
  true,
  'Fórmula válida. Pesos somam 100%.'
);
```

---

## 🧪 Testar Funcionalidades

### 1. Ver Turmas

Recarregue a página [http://localhost:3000](http://localhost:3000) e você deve ver:
- ✅ Turma "10ª Classe A" na lista
- ✅ 5 alunos quando selecionar a turma

### 2. Testar Formula Builder

1. Navegue para a tela de fórmulas (quando implementada)
2. Ou teste via componente isolado

### 3. Lançar Notas de Teste

```sql
-- Obter IDs necessários
SELECT id, codigo_componente FROM componentes_avaliacao 
WHERE disciplina_id = '[UUID-disciplina]';

SELECT id, nome_completo FROM alunos 
WHERE turma_id = '[UUID-turma]';

-- Lançar notas para P1
INSERT INTO notas (aluno_id, componente_id, turma_id, valor, lancado_por)
VALUES 
  ('[UUID-Ana]', '[UUID-p1]', '[UUID-turma]', 14, '[UUID-professor]'),
  ('[UUID-Bruno]', '[UUID-p1]', '[UUID-turma]', 16, '[UUID-professor]'),
  ('[UUID-Carlos]', '[UUID-p1]', '[UUID-turma]', 12, '[UUID-professor]'),
  ('[UUID-Diana]', '[UUID-p1]', '[UUID-turma]', 18, '[UUID-professor]'),
  ('[UUID-Eduardo]', '[UUID-p1]', '[UUID-turma]', 15, '[UUID-professor]');

-- Repetir para P2 e Trabalho com valores diferentes
```

### 4. Calcular Notas Finais

```bash
# Testar Edge Function localmente (requer Supabase CLI)
curl -X POST http://localhost:54321/functions/v1/calculate-final-grade \
  -H "Authorization: Bearer [sua-anon-key]" \
  -H "Content-Type: application/json" \
  -d '{
    "aluno_id": "[UUID-Ana]",
    "turma_id": "[UUID-turma]",
    "disciplina_id": "[UUID-disciplina]",
    "trimestre": 1
  }'
```

---

## 🚀 Deploy Edge Functions

```bash
# 1. Instalar Supabase CLI
npm install -g supabase

# 2. Login
supabase login

# 3. Link ao projeto
supabase link --project-ref [seu-projeto-ref]

# 4. Deploy functions
supabase functions deploy calculate-final-grade
supabase functions deploy generate-report
supabase functions deploy import-csv
supabase functions deploy send-notification

# 5. Verificar deploy
supabase functions list
```

---

## 🌐 Deploy Frontend (Vercel)

```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel

# 4. Configurar variáveis de ambiente no dashboard
# Vercel Dashboard → Settings → Environment Variables
# Adicionar:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY

# 5. Deploy para produção
vercel --prod
```

---

## ✅ Checklist de Verificação

- [ ] Supabase projeto criado
- [ ] Schema SQL aplicado (12 tabelas)
- [ ] Chaves API copiadas
- [ ] `.env.local` configurado
- [ ] `npm install` executado
- [ ] Servidor dev rodando (`npm run dev`)
- [ ] Primeiro professor criado
- [ ] Primeira turma criada
- [ ] Alunos de teste adicionados
- [ ] Componentes configurados
- [ ] Fórmula criada
- [ ] Notas de teste lançadas
- [ ] Edge Functions deployed
- [ ] Frontend deployed (Vercel)

---

## 🆘 Troubleshooting

### Erro: "Invalid API key"
- Verifique se copiou a chave correta do dashboard
- Certifique-se de usar `anon public` no frontend

### Erro: "Row Level Security policy violation"
- Verifique se o professor está corretamente vinculado ao user_id
- Confirme que as policies RLS foram criadas

### Página em branco após login
- Abra o console do navegador (F12)
- Verifique erros de rede ou JavaScript
- Confirme que há turmas associadas ao professor

### Edge Functions não funcionam
- Verifique se fez deploy: `supabase functions list`
- Teste localmente primeiro: `supabase functions serve`
- Verifique logs: `supabase functions logs [nome-funcao]`

---

## 📞 Próximos Passos

1. **Testar fluxo completo** com dados reais
2. **Adicionar mais professores e turmas**
3. **Implementar componente de criação de turma** (UI)
4. **Adicionar portal do aluno**
5. **Configurar notificações por email**
6. **Preparar para escola piloto**

---

**Pronto para começar! 🎉**
