# Mini-Pautas - API Documentation

## Base URL

```
Production: https://afueujnyeglgnaylaxmp.supabase.co/functions/v1
Local: http://localhost:54321/functions/v1
```

## Authentication

All requests require authentication via Bearer token:

```bash
Authorization: Bearer <SUPABASE_ANON_KEY>
```

---

## Edge Functions

### 1. Calculate Final Grade

Calculates the final grade for a student based on component grades and formula.

**Endpoint:** `POST /calculate-final-grade`

**Request Body:**
```json
{
  "aluno_id": "uuid",
  "turma_id": "uuid",
  "disciplina_id": "uuid",
  "trimestre": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "aluno_id": "uuid",
    "turma_id": "uuid",
    "disciplina_id": "uuid",
    "trimestre": 1,
    "nota_final": 16.2,
    "classificacao": "Bom",
    "calculo_detalhado": {
      "componentes": {
        "p1": {
          "valor": 14,
          "peso": 0.3,
          "contribuicao": 4.2,
          "calculo": "0.30 * 14 = 4.20"
        },
        "p2": {
          "valor": 16,
          "peso": 0.3,
          "contribuicao": 4.8,
          "calculo": "0.30 * 16 = 4.80"
        },
        "trabalho": {
          "valor": 18,
          "peso": 0.4,
          "contribuicao": 7.2,
          "calculo": "0.40 * 18 = 7.20"
        }
      },
      "nota_final": 16.2,
      "expressao_completa": "0.30*14 + 0.30*16 + 0.40*18 = 4.20 + 4.80 + 7.20 = 16.20",
      "classificacao": "Bom"
    }
  },
  "calculation": { ... }
}
```

**Errors:**
- `400`: Missing required fields
- `404`: Formula not found
- `400`: Missing component grades

---

### 2. Generate Report

Generates a complete mini-pauta report with statistics.

**Endpoint:** `GET /generate-report`

**Query Parameters:**
- `turma_id` (required): UUID of the class
- `disciplina_id` (required): UUID of the discipline
- `trimestre` (required): Trimester number (1, 2, or 3)

**Example:**
```bash
GET /generate-report?turma_id=xxx&disciplina_id=yyy&trimestre=1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "mini_pauta": [
      {
        "turma_id": "uuid",
        "turma_nome": "10ª Classe A",
        "disciplina_nome": "Matemática",
        "aluno_id": "uuid",
        "aluno_nome": "Ana Costa",
        "numero_processo": "A001",
        "nota_final": 16.2,
        "classificacao": "Bom",
        "professor_nome": "João Silva",
        "escola_nome": "Escola Piloto"
      }
    ],
    "estatisticas": {
      "total_alunos": 30,
      "media_turma": 14.5,
      "nota_minima": 8.0,
      "nota_maxima": 19.5,
      "aprovados": 25,
      "reprovados": 5,
      "taxa_aprovacao": 83.33
    }
  }
}
```

---

### 3. Import CSV

Imports student data from CSV format.

**Endpoint:** `POST /import-csv`

**Request Body:**
```json
{
  "turma_id": "uuid",
  "csv_data": "numero_processo,nome_completo,genero,data_nascimento,nome_encarregado,telefone_encarregado\nA001,Ana Costa,F,2005-03-15,Maria Costa,+244 923 456 789\n..."
}
```

**CSV Format:**
```csv
numero_processo,nome_completo,genero,data_nascimento,nome_encarregado,telefone_encarregado
A001,Ana Costa,F,2005-03-15,Maria Costa,+244 923 456 789
A002,Bruno Silva,M,2005-07-22,José Silva,+244 924 567 890
```

**Response:**
```json
{
  "success": true,
  "imported": 25,
  "errors": [
    {
      "row": 5,
      "field": "general",
      "message": "Duplicate numero_processo"
    }
  ]
}
```

---

### 4. Send Notification

Sends a notification to a user.

**Endpoint:** `POST /send-notification`

**Request Body:**
```json
{
  "destinatario_id": "uuid",
  "tipo": "nota_lancada",
  "titulo": "Nova nota lançada",
  "mensagem": "Foi lançada uma nota de 16 para Matemática",
  "dados_adicionais": {
    "nota_id": "uuid",
    "valor": 16,
    "componente": "P1"
  }
}
```

**Notification Types:**
- `nota_lancada`: Grade posted
- `nota_final_calculada`: Final grade calculated
- `anuncio`: General announcement

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "destinatario_id": "uuid",
    "tipo": "nota_lancada",
    "titulo": "Nova nota lançada",
    "mensagem": "Foi lançada uma nota de 16 para Matemática",
    "lida": false,
    "created_at": "2025-12-05T17:00:00Z"
  }
}
```

---

## Database Direct Access (via Supabase Client)

### Tables

All tables support standard CRUD operations via Supabase client with RLS policies.

#### Get Classes for Professor

```typescript
const { data, error } = await supabase
  .from('turmas')
  .select('*')
  .eq('professor_id', professorId)
  .order('ano_lectivo', { ascending: false })
```

#### Get Students in Class

```typescript
const { data, error } = await supabase
  .from('alunos')
  .select('*')
  .eq('turma_id', turmaId)
  .eq('ativo', true)
  .order('nome_completo')
```

#### Get Grades for Student

```typescript
const { data, error } = await supabase
  .from('notas')
  .select(`
    *,
    componentes_avaliacao (
      nome,
      peso_percentual,
      escala_minima,
      escala_maxima
    )
  `)
  .eq('aluno_id', alunoId)
  .eq('turma_id', turmaId)
```

#### Get Mini-Pauta (View)

```typescript
const { data, error } = await supabase
  .from('vw_mini_pauta')
  .select('*')
  .eq('turma_id', turmaId)
  .eq('disciplina_id', disciplinaId)
  .order('aluno_nome')
```

#### Get Class Statistics (View)

```typescript
const { data, error } = await supabase
  .from('vw_estatisticas_turma')
  .select('*')
  .eq('turma_id', turmaId)
  .eq('disciplina_id', disciplinaId)
  .single()
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Missing or invalid parameters |
| 401 | Unauthorized - Invalid or missing auth token |
| 403 | Forbidden - RLS policy violation |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

---

## Rate Limits

- **Development**: No limits
- **Production**: 100 requests per 15 minutes per IP

---

## Examples

### Complete Flow Example

```typescript
// 1. Get professor profile
const { data: professor } = await supabase
  .from('professores')
  .select('*')
  .eq('user_id', user.id)
  .single()

// 2. Get professor's classes
const { data: turmas } = await supabase
  .from('turmas')
  .select('*')
  .eq('professor_id', professor.id)

// 3. Get students in class
const { data: alunos } = await supabase
  .from('alunos')
  .select('*')
  .eq('turma_id', turmas[0].id)

// 4. Get evaluation components
const { data: componentes } = await supabase
  .from('componentes_avaliacao')
  .select('*')
  .eq('turma_id', turmas[0].id)

// 5. Submit grades
const { error } = await supabase
  .from('notas')
  .upsert({
    aluno_id: alunos[0].id,
    componente_id: componentes[0].id,
    turma_id: turmas[0].id,
    valor: 16,
    lancado_por: professor.id
  })

// 6. Calculate final grade (Edge Function)
const response = await fetch(
  'https://afueujnyeglgnaylaxmp.supabase.co/functions/v1/calculate-final-grade',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      aluno_id: alunos[0].id,
      turma_id: turmas[0].id,
      disciplina_id: disciplina.id,
      trimestre: 1
    })
  }
)

// 7. Get mini-pauta
const { data: miniPauta } = await supabase
  .from('vw_mini_pauta')
  .select('*')
  .eq('turma_id', turmas[0].id)
```

---

## Testing

### cURL Examples

```bash
# Calculate final grade
curl -X POST https://afueujnyeglgnaylaxmp.supabase.co/functions/v1/calculate-final-grade \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "aluno_id": "uuid-here",
    "turma_id": "uuid-here",
    "disciplina_id": "uuid-here",
    "trimestre": 1
  }'

# Generate report
curl "https://afueujnyeglgnaylaxmp.supabase.co/functions/v1/generate-report?turma_id=uuid&disciplina_id=uuid&trimestre=1" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Import CSV
curl -X POST https://afueujnyeglgnaylaxmp.supabase.co/functions/v1/import-csv \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "turma_id": "uuid-here",
    "csv_data": "numero_processo,nome_completo,genero\nA001,Ana Costa,F"
  }'
```

---

## Support

For API issues or questions:
- **Email**: api@mini-pautas.ao
- **Documentation**: See QUICKSTART.md
- **GitHub**: (repository URL)
