# PROMPT PARA IMPLEMENTAR MÓDULO DE DIREÇÃO PROVINCIAL - EduGest Angola

## CONTEXTO DO SISTEMA

Estou a desenvolver o **EduGest Angola**, um Sistema Integrado de Gestão Educacional para o sistema educativo angolano. O sistema é construído com:

- **Frontend**: React 18 + TypeScript + TailwindCSS
- **Backend**: Supabase (PostgreSQL + Edge Functions + RLS)
- **Estado**: React Query + Context API
- **Deploy**: Vercel + Supabase Cloud

### HIERARQUIA DO SISTEMA

```
SUPERADMIN (Nacional)
    ↓
DIREÇÃO PROVINCIAL (Província) ← A IMPLEMENTAR
    ↓
DIREÇÃO MUNICIPAL (Município) ← JÁ EXISTE
    ↓
ESCOLA
    ↓
PROFESSOR → ALUNO → ENCARREGADO
```

### ESTRUTURA DE DIRETÓRIOS DO PROJETO

```
src/
├── App.tsx                    # Router principal
├── components/                # Componentes gerais (81 arquivos)
├── contexts/
│   └── AuthContext.tsx        # Autenticação e perfis
├── lib/
│   └── supabaseClient.ts      # Cliente Supabase
├── modules/
│   └── municipal_education/   # MÓDULO DE REFERÊNCIA
│       ├── api/               # Funções de API
│       ├── components/        # Páginas do módulo
│       ├── hooks/             # Custom hooks
│       ├── types/             # Tipos TypeScript
│       └── index.ts           # Re-exports
├── types/
│   └── index.ts               # Tipos globais
└── utils/                     # Utilitários
```

---

## MODELO DE DADOS EXISTENTE

### Tabela: escolas
```sql
CREATE TABLE escolas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    codigo_escola TEXT UNIQUE,
    provincia TEXT NOT NULL,    -- Filtro para Direção Provincial
    municipio TEXT NOT NULL,    -- Filtro para Direção Municipal
    ativo BOOLEAN DEFAULT true,
    bloqueado BOOLEAN DEFAULT false,
    configuracoes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabela: direcao_municipal (REFERÊNCIA)
```sql
CREATE TABLE direcao_municipal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    provincia TEXT NOT NULL,
    municipio TEXT NOT NULL UNIQUE, -- Uma direção por município
    email TEXT NOT NULL UNIQUE,
    telefone TEXT,
    cargo TEXT,
    numero_funcionario TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabela: user_profiles
```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    tipo_perfil TEXT NOT NULL, -- 'ESCOLA', 'PROFESSOR', 'DIRECAO_MUNICIPAL', 'DIRECAO_PROVINCIAL', etc.
    escola_id UUID,            -- NULL para direções e SUPERADMIN
    ativo BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Outras Tabelas Relevantes
- `professores` - Professores vinculados a escolas
- `turmas` - Turmas vinculadas a escolas
- `alunos` - Alunos vinculados a turmas
- `notas_finais` - Notas finais para relatórios
- `circulares_municipais` - Circulares publicadas pela direção municipal
- `solicitacoes_documentos` - Pedidos de documentos das escolas

---

## MÓDULO MUNICIPAL_EDUCATION (CÓDIGO DE REFERÊNCIA)

### Estrutura do Módulo
```
src/modules/municipal_education/
├── api/
│   ├── circulares.ts           # CRUD de circulares
│   ├── documentosOficiais.ts   # Geração de documentos
│   ├── escolasManagement.ts    # Gestão de escolas do município
│   ├── funcionariosQuery.ts    # Consulta de funcionários
│   ├── pedagogicSupervision.ts # Supervisão pedagógica
│   └── relatorios.ts           # Relatórios consolidados
├── components/
│   ├── CircularesPage.tsx
│   ├── EscolasGestao.tsx
│   ├── FuncionariosConsulta.tsx
│   ├── RelatoriosPage.tsx
│   └── SupervisaoPedagogica.tsx
├── hooks/
│   ├── useCirculares.ts
│   ├── useEscolasManagement.ts
│   ├── useFuncionarios.ts
│   ├── usePedagogicData.ts
│   └── useRelatoriosMunicipais.ts
├── types/
│   └── index.ts
└── index.ts
```

### Exemplo: types/index.ts (Municipal)
```typescript
export type EstadoEscola = 'activa' | 'suspensa' | 'bloqueada' | 'inactiva';

export interface HistoricoAdministrativoEscola {
    id: string;
    escola_id: string;
    estado_anterior: EstadoEscola | null;
    estado_novo: EstadoEscola;
    motivo: string | null;
    alterado_por: string | null;
    alterado_por_tipo: 'DIRECAO_MUNICIPAL' | 'SUPERADMIN' | null;
    created_at: string;
}

export type TipoCircular = 'circular' | 'aviso' | 'comunicado' | 'despacho';

export interface CircularMunicipal {
    id: string;
    numero_circular: string | null;
    titulo: string;
    conteudo: string;
    tipo: TipoCircular;
    municipio: string;
    provincia: string;
    urgente: boolean;
    publicado: boolean;
    data_publicacao: string;
    created_by: string;
    created_at: string;
}

export interface EstatisticasMunicipioCompletas {
    total_escolas: number;
    escolas_activas: number;
    escolas_suspensas: number;
    total_alunos: number;
    total_professores: number;
    media_geral: number;
    taxa_aprovacao: number;
}
```

### Exemplo: api/escolasManagement.ts
```typescript
import { supabase } from '../../../lib/supabaseClient';
import type { Escola } from '../../../types';
import type { EstadoEscola } from '../types';

export async function fetchEscolasMunicipio(municipio: string): Promise<Escola[]> {
    const { data, error } = await supabase
        .from('escolas')
        .select('*')
        .eq('municipio', municipio)
        .order('nome');

    if (error) throw error;
    return data || [];
}

export async function fetchEscolaDetalhes(escolaId: string): Promise<{
    escola: Escola;
    total_professores: number;
    total_turmas: number;
    total_alunos: number;
}> {
    const { data: escola, error } = await supabase
        .from('escolas')
        .select('*')
        .eq('id', escolaId)
        .single();

    if (error) throw error;

    const { count: total_professores } = await supabase
        .from('professores')
        .select('*', { count: 'exact', head: true })
        .eq('escola_id', escolaId)
        .eq('ativo', true);

    // ... counts de turmas e alunos

    return { escola, total_professores: total_professores || 0, total_turmas: 0, total_alunos: 0 };
}

export async function updateEstadoEscola(
    escolaId: string,
    novoEstado: EstadoEscola,
    motivo: string
): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilizador não autenticado');

    // Update escola com base no estado
    const updates: any = {};
    switch (novoEstado) {
        case 'activa':
            updates.ativo = true;
            updates.bloqueado = false;
            break;
        case 'bloqueada':
            updates.bloqueado = true;
            updates.bloqueado_motivo = motivo;
            break;
        // ...
    }

    await supabase.from('escolas').update(updates).eq('id', escolaId);

    // Criar histórico
    await supabase.from('historico_administrativo_escolas').insert({
        escola_id: escolaId,
        estado_novo: novoEstado,
        motivo,
        alterado_por: user.id,
        alterado_por_tipo: 'DIRECAO_MUNICIPAL'
    });
}
```

### Exemplo: hooks/useEscolasManagement.ts
```typescript
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import type { Escola } from '../../../types';
import { fetchEscolasMunicipio, updateEstadoEscola } from '../api/escolasManagement';

export function useEscolasManagement() {
    const { user } = useAuth();
    const [escolas, setEscolas] = useState<Escola[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const municipio = user?.direcaoMunicipal?.municipio;

    const refresh = useCallback(async () => {
        if (!municipio) return;
        setLoading(true);
        try {
            const data = await fetchEscolasMunicipio(municipio);
            setEscolas(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro');
        } finally {
            setLoading(false);
        }
    }, [municipio]);

    useEffect(() => { refresh(); }, [refresh]);

    const alterarEstado = useCallback(async (escolaId: string, estado: string, motivo: string) => {
        await updateEstadoEscola(escolaId, estado as any, motivo);
        await refresh();
    }, [refresh]);

    return { escolas, loading, error, refresh, alterarEstado };
}
```

### Exemplo: Integração no App.tsx (Rotas DIRECAO_MUNICIPAL)
```typescript
// Lazy load
const DirecaoMunicipalDashboard = lazy(() => import('./components/DirecaoMunicipalDashboard'));
const SupervisaoPedagogica = lazy(() => import('./modules/municipal_education/components/SupervisaoPedagogica'));
const FuncionariosConsulta = lazy(() => import('./modules/municipal_education/components/FuncionariosConsulta'));
const CircularesPage = lazy(() => import('./modules/municipal_education/components/CircularesPage'));

// Rotas
if (isDirecaoMunicipal) {
    switch (currentPage) {
        case 'dashboard':
            return <DirecaoMunicipalDashboard onNavigate={handleNavigate} />;
        case 'escolas':
            return <EscolasOverviewPage onNavigate={handleNavigate} />;
        case 'supervisao-pedagogica':
            return <SupervisaoPedagogica onNavigate={handleNavigate} />;
        case 'funcionarios':
            return <FuncionariosConsulta onNavigate={handleNavigate} />;
        case 'circulares':
            return <CircularesPage onNavigate={handleNavigate} />;
        // ...
    }
}
```

### Exemplo: AuthContext.tsx (Detecção de Perfil)
```typescript
interface AuthUser {
    id: string;
    email: string;
    profile: UserProfile | null;
    direcaoMunicipal?: DirecaoMunicipalProfile;
    // direcaoProvincial?: DirecaoProvincialProfile; // A ADICIONAR
}

// Na função de fetch
if (profile.tipo_perfil === 'DIRECAO_MUNICIPAL') {
    const { data: direcaoMunicipal } = await supabase
        .from('direcao_municipal')
        .select('*')
        .eq('user_id', user.id)
        .single();
    
    authUser.direcaoMunicipal = { ...direcaoMunicipal, user_profile: profile };
}
```

---

## O QUE PRECISO QUE IMPLEMENTES

### 1. CRIAR MÓDULO `provincial_education`

Estrutura:
```
src/modules/provincial_education/
├── api/
│   ├── direcoesMunicipaisManagement.ts  # Gestão de direções municipais
│   ├── escolasProvincialQuery.ts         # Consulta escolas da província
│   ├── pedagogicSupervisionProvincial.ts # Supervisão pedagógica provincial
│   ├── circularesProvinciais.ts          # Circulares provinciais
│   └── relatoriosProvinciais.ts          # Relatórios consolidados
├── components/
│   ├── DirecaoProvincialDashboard.tsx    # Dashboard principal
│   ├── DirecoesMunicipaisGestao.tsx      # Gestão de direções municipais
│   ├── EscolasProvincialOverview.tsx     # Overview de escolas (read-only)
│   ├── SupervisaoPedagogicaProvincial.tsx
│   ├── CircularesProvinciaisPage.tsx
│   ├── RelatoriosProvinciaisPage.tsx
│   └── index.ts
├── hooks/
│   ├── useDirecoesMunicipais.ts
│   ├── useEscolasProvincial.ts
│   ├── usePedagogicDataProvincial.ts
│   ├── useCircularesProvinciais.ts
│   └── useRelatoriosProvinciais.ts
├── types/
│   └── index.ts
└── index.ts
```

### 2. MIGRAÇÃO SQL

```sql
-- Tabela principal
CREATE TABLE direcao_provincial (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    provincia TEXT NOT NULL UNIQUE, -- Uma direção por província
    email TEXT NOT NULL UNIQUE,
    telefone TEXT,
    cargo TEXT,
    numero_funcionario TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Histórico de ações sobre direções municipais
CREATE TABLE historico_administrativo_municipal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    direcao_municipal_id UUID REFERENCES direcao_municipal(id),
    estado_anterior TEXT,
    estado_novo TEXT,
    motivo TEXT,
    observacoes TEXT,
    alterado_por UUID,
    alterado_por_tipo TEXT DEFAULT 'DIRECAO_PROVINCIAL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Circulares provinciais
CREATE TABLE circulares_provinciais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_circular TEXT,
    titulo TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    tipo TEXT DEFAULT 'circular',
    provincia TEXT NOT NULL,
    urgente BOOLEAN DEFAULT false,
    publicado BOOLEAN DEFAULT false,
    data_publicacao TIMESTAMP WITH TIME ZONE,
    data_validade TIMESTAMP WITH TIME ZONE,
    anexo_url TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices e RLS conforme padrão existente
```

### 3. FUNCIONALIDADES REQUERIDAS

1. **Dashboard Provincial**
   - Cards: Total escolas, Total alunos, Total professores, Direções municipais
   - Lista de municípios com estatísticas
   - Solicitações pendentes de toda província
   - Ações rápidas

2. **Gestão de Direções Municipais**
   - Listar todas direções municipais da província
   - Ver detalhes (quantas escolas, estatísticas)
   - Suspender/Reativar direção municipal
   - Histórico de alterações

3. **Consulta de Escolas** (Read-only)
   - Ver todas escolas da província
   - Filtrar por município
   - Estatísticas agregadas

4. **Supervisão Pedagógica Provincial**
   - Estatísticas de aprovação por município
   - Comparativo entre municípios
   - Média provincial

5. **Circulares Provinciais**
   - Publicar circulares para toda província
   - Rastrear leitura

6. **Relatórios Provinciais**
   - Relatório consolidado da província
   - Comparativo por município
   - Exportação PDF/Excel

### 4. PADRÃO DE FILTRO

A Direção Provincial filtra sempre por `provincia`:

```typescript
// Em vez de municipio como na DIRECAO_MUNICIPAL
const provincia = user?.direcaoProvincial?.provincia;

// Buscar escolas
const { data } = await supabase
    .from('escolas')
    .select('*')
    .eq('provincia', provincia);

// Buscar direções municipais
const { data } = await supabase
    .from('direcao_municipal')
    .select('*')
    .eq('provincia', provincia);
```

### 5. ALTERAÇÕES NECESSÁRIAS

1. **types/index.ts** - Adicionar `DirecaoProvincial` e `DirecaoProvincialProfile`
2. **AuthContext.tsx** - Adicionar detecção de `DIRECAO_PROVINCIAL`
3. **App.tsx** - Adicionar rotas para Direção Provincial
4. **DashboardLayout.tsx** - Menu específico para Direção Provincial

---

## PROVÍNCIAS DE ANGOLA

Use esta lista para validação:
- Bengo, Benguela, Bié, Cabinda, Cuando Cubango, Cuanza Norte, Cuanza Sul
- Cunene, Huambo, Huíla, Luanda, Lunda Norte, Lunda Sul, Malanje
- Moxico, Namibe, Uíge, Zaire

---

## INSTRUÇÕES

1. Gera todo o código necessário seguindo EXATAMENTE o padrão do módulo `municipal_education`
2. Usa TypeScript com tipos fortes
3. Segue as convenções de nomenclatura em português (nomes de variáveis podem ser em inglês)
4. Implementa RLS policies para segurança
5. Cria componentes reutilizáveis e bem organizados
6. Documenta funções importantes

**Começa pela migração SQL, depois tipos, depois API, hooks e finalmente componentes.**
