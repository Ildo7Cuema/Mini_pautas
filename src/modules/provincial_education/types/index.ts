/**
 * Provincial Education Module Types
 * Types specific to the Provincial Education Direction functionality
 */

// ============================================
// HISTÓRICO ADMINISTRATIVO DE DIREÇÕES MUNICIPAIS
// ============================================

export type EstadoDirecaoMunicipal = 'activa' | 'suspensa' | 'inactiva';

export interface HistoricoAdministrativoDirecaoMunicipal {
    id: string;
    direcao_municipal_id: string;
    estado_anterior: EstadoDirecaoMunicipal | null;
    estado_novo: EstadoDirecaoMunicipal;
    motivo: string | null;
    observacoes: string | null;
    alterado_por: string | null;
    alterado_por_tipo: 'DIRECAO_PROVINCIAL' | 'SUPERADMIN' | null;
    created_at: string;
    // Joined fields
    direcao_municipal?: {
        id: string;
        nome: string;
        municipio: string;
    };
    alterado_por_nome?: string;
}

// ============================================
// CIRCULARES PROVINCIAIS
// ============================================

export type TipoCircularProvincial = 'circular' | 'aviso' | 'comunicado' | 'despacho';

export interface CircularProvincial {
    id: string;
    numero_circular: string | null;
    titulo: string;
    conteudo: string;
    tipo: TipoCircularProvincial;
    provincia: string;
    urgente: boolean;
    publicado: boolean;
    data_publicacao: string | null;
    data_validade: string | null;
    anexo_url: string | null;
    anexo_filename: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
    // Computed fields
    leituras_count?: number;
    direcoes_pendentes?: number;
    escolas_pendentes?: number;
}

export interface LeituraCircularProvincial {
    id: string;
    circular_id: string;
    direcao_municipal_id: string | null;
    escola_id: string | null;
    lido_por: string;
    lido_por_nome: string | null;
    lido_por_cargo: string | null;
    lido_em: string;
    // Joined fields
    direcao_municipal?: {
        id: string;
        nome: string;
        municipio: string;
    };
    escola?: {
        id: string;
        nome: string;
        codigo_escola: string;
    };
}

export interface CreateCircularProvincialRequest {
    numero_circular?: string;
    titulo: string;
    conteudo: string;
    tipo: TipoCircularProvincial;
    urgente?: boolean;
    data_validade?: string;
    anexo_url?: string;
    anexo_filename?: string;
}

// ============================================
// SUPERVISÃO PEDAGÓGICA PROVINCIAL
// ============================================

export interface IndicadoresPedagogicosProvinciais {
    provincia: string;
    ano_lectivo: string;
    trimestre?: 1 | 2 | 3;
    total_municipios: number;
    total_escolas: number;
    total_alunos: number;
    total_turmas: number;
    media_geral: number;
    taxa_aprovacao: number;
    taxa_reprovacao: number;
    notas_por_classificacao: {
        excelente: number;
        bom: number;
        suficiente: number;
        insuficiente: number;
    };
}

export interface IndicadoresPorMunicipio {
    municipio: string;
    total_escolas: number;
    escolas_activas: number;
    total_alunos: number;
    total_professores: number;
    total_turmas: number;
    media_geral: number;
    taxa_aprovacao: number;
}

export interface ComparativoMunicipios {
    municipio: string;
    total_escolas: number;
    total_alunos: number;
    total_professores: number;
    media_aprovacao: number;
    ranking: number;
}

// ============================================
// ESTATÍSTICAS DA PROVÍNCIA
// ============================================

export interface EstatisticasProvincia {
    total_municipios: number;
    total_direcoes_municipais: number;
    direcoes_activas: number;
    direcoes_inactivas: number;
    total_escolas: number;
    escolas_activas: number;
    total_professores: number;
    total_alunos: number;
    total_turmas: number;
    media_geral: number;
    taxa_aprovacao: number;
    circulares_activas: number;
}

export interface EstatisticasProvinciaCompletas extends EstatisticasProvincia {
    estatisticas_por_municipio: IndicadoresPorMunicipio[];
    direcoes_municipais: DirecaoMunicipalResumida[];
}

export interface DirecaoMunicipalResumida {
    id: string;
    nome: string;
    municipio: string;
    email: string;
    telefone?: string;
    ativo: boolean;
    escolas_count: number;
    created_at: string;
}

// ============================================
// DIREÇÕES MUNICIPAIS - GESTÃO PROVINCIAL
// ============================================

export interface DirecaoMunicipalDetalhes {
    id: string;
    nome: string;
    municipio: string;
    provincia: string;
    email: string;
    telefone?: string;
    cargo?: string;
    numero_funcionario?: string;
    ativo: boolean;
    created_at: string;
    // Statistics
    total_escolas: number;
    escolas_activas: number;
    total_professores: number;
    total_alunos: number;
    total_turmas: number;
    solicitacoes_pendentes: number;
}

// ============================================
// FILTROS
// ============================================

export interface FiltrosDirecoesMunicipais {
    municipio?: string;
    ativo?: boolean;
    search?: string;
}

export interface FiltrosEscolasProvincia {
    municipio?: string;
    ativo?: boolean;
    bloqueado?: boolean;
    search?: string;
}

export interface FiltrosCircularesProvinciais {
    tipo?: TipoCircularProvincial;
    publicado?: boolean;
    urgente?: boolean;
    search?: string;
}

// ============================================
// RELATÓRIOS PROVINCIAIS
// ============================================

export interface RelatorioProvincial {
    tipo: 'consolidado' | 'comparativo' | 'direcoes_municipais' | 'escolas' | 'pedagogico';
    provincia: string;
    periodo: {
        inicio: string;
        fim: string;
    };
    dados: unknown; // Specific to each report type
    generated_at: string;
    generated_by: string;
}

export interface RelatorioConsolidadoProvincia {
    provincia: string;
    periodo: string;
    data_geracao: string;
    estatisticas_gerais: {
        total_escolas: number;
        total_alunos: number;
        total_professores: number;
        taxa_aprovacao_media: number;
        escolas_inactivas: number;
        escolas_bloqueadas: number;
    };
    dados_por_municipio: {
        municipio: string;
        total_escolas: number;
        total_alunos: number;
        taxa_aprovacao: number;
    }[];
    estatisticas: EstatisticasProvincia;
    comparativo_municipios: ComparativoMunicipios[];
    direcoes_municipais: DirecaoMunicipalResumida[];
}

// ============================================
// LABELS E CONSTANTES
// ============================================

export const LABELS_ESTADO_DIRECAO_MUNICIPAL: Record<EstadoDirecaoMunicipal, string> = {
    activa: 'Activa',
    suspensa: 'Suspensa',
    inactiva: 'Inactiva'
};

export const LABELS_TIPO_CIRCULAR: Record<TipoCircularProvincial, string> = {
    circular: 'Circular',
    aviso: 'Aviso',
    comunicado: 'Comunicado',
    despacho: 'Despacho'
};

export const CORES_ESTADO_DIRECAO: Record<EstadoDirecaoMunicipal, { bg: string; text: string }> = {
    activa: { bg: 'bg-green-100', text: 'text-green-800' },
    suspensa: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    inactiva: { bg: 'bg-red-100', text: 'text-red-800' }
};

export const CORES_TIPO_CIRCULAR: Record<TipoCircularProvincial, { bg: string; text: string; border: string }> = {
    circular: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    aviso: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    comunicado: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    despacho: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' }
};
