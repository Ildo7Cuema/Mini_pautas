/**
 * TypeScript Type Definitions for Mini-Pautas System
 */

// ============================================
// DATABASE ENTITIES
// ============================================

export interface Escola {
    id: string;
    nome: string;
    codigo_escola: string;
    provincia: string;
    municipio: string;
    endereco?: string;
    telefone?: string;
    email?: string;
    configuracoes?: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface Professor {
    id: string;
    escola_id: string;
    user_id: string;
    nome_completo: string;
    numero_agente: string;
    email: string;
    telefone?: string;
    especialidade?: string;
    funcoes: string[];
    ativo: boolean;
    created_at: string;
    updated_at: string;
}

export interface Turma {
    id: string;
    escola_id: string;
    professor_id: string;
    nome: string;
    codigo_turma: string;
    ano_lectivo: number;
    trimestre: 1 | 2 | 3;
    nivel_ensino: string;
    sala?: number;
    turno?: 'manhã' | 'tarde' | 'noite';
    capacidade_maxima: number;
    created_at: string;
    updated_at: string;
}

export interface Aluno {
    id: string;
    turma_id: string;
    user_id?: string;
    nome_completo: string;
    numero_processo: string;
    data_nascimento?: string;
    genero?: 'M' | 'F' | 'Outro';
    nome_encarregado?: string;
    telefone_encarregado?: string;
    email_encarregado?: string;
    endereco?: string;
    ativo: boolean;
    created_at: string;
    updated_at: string;
}

export interface Disciplina {
    id: string;
    professor_id: string;
    turma_id: string;
    nome: string;
    codigo_disciplina: string;
    carga_horaria?: number;
    descricao?: string;
    ordem?: number;  // Display order in reports
    created_at: string;
    updated_at: string;
}

export interface ComponenteAvaliacao {
    id: string;
    disciplina_id: string;
    turma_id: string;
    nome: string;
    codigo_componente: string;
    peso_percentual: number;
    escala_minima: number;
    escala_maxima: number;
    obrigatorio: boolean;
    ordem: number;
    descricao?: string;
    is_calculated?: boolean;
    formula_expression?: string | null;
    depends_on_components?: string[] | null;
    tipo_calculo?: 'trimestral' | 'anual';
    created_at: string;
    updated_at: string;
}

export interface Formula {
    id: string;
    turma_id: string;
    disciplina_id: string;
    expressao: string;
    componentes_usados: string[];
    validada: boolean;
    mensagem_validacao?: string;
    created_at: string;
    updated_at: string;
}

export interface Nota {
    id: string;
    aluno_id: string;
    componente_id: string;
    turma_id: string;
    trimestre: 1 | 2 | 3;
    valor: number;
    observacao?: string;
    lancado_por: string;
    data_lancamento: string;
    created_at: string;
    updated_at: string;
}

export interface NotaFinal {
    id: string;
    aluno_id: string;
    turma_id: string;
    disciplina_id: string;
    trimestre: 1 | 2 | 3;
    nota_final: number;
    classificacao: string;
    calculo_detalhado?: CalculoDetalhado;
    data_calculo: string;
    created_at: string;
    updated_at: string;
}

export interface Auditoria {
    id: string;
    user_id?: string;
    tabela: string;
    operacao: 'INSERT' | 'UPDATE' | 'DELETE';
    dados_antigos?: Record<string, any>;
    dados_novos?: Record<string, any>;
    ip_address?: string;
    user_agent?: string;
    created_at: string;
}

export interface Notificacao {
    id: string;
    destinatario_id: string;
    tipo: string;
    titulo: string;
    mensagem: string;
    dados_adicionais?: Record<string, any>;
    lida: boolean;
    lida_em?: string;
    created_at: string;
}

export interface ConfiguracaoSistema {
    id: string;
    chave: string;
    valor: Record<string, any>;
    descricao?: string;
    created_at: string;
    updated_at: string;
}

// ============================================
// CALCULATION & REPORTING TYPES
// ============================================

export interface CalculoDetalhado {
    componentes: Record<string, ComponenteCalculo>;
    nota_final: number;
    expressao_completa: string;
    classificacao: string;
}

export interface ComponenteCalculo {
    valor: number;
    peso: number;
    contribuicao: number;
    calculo: string;
}

export interface MiniPauta {
    turma: Turma;
    disciplina: Disciplina;
    professor: Professor;
    escola: Escola;
    alunos: AlunoComNota[];
    estatisticas: EstatisticasTurma;
    componentes: ComponenteAvaliacao[];
    formula: Formula;
}

export interface AlunoComNota extends Aluno {
    nota_final?: NotaFinal;
    notas_componentes?: Record<string, Nota>;
}

export interface EstatisticasTurma {
    total_alunos: number;
    media_turma: number;
    nota_minima: number;
    nota_maxima: number;
    aprovados: number;
    reprovados: number;
    taxa_aprovacao: number;
    distribuicao_classificacoes: Record<string, number>;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface CreateTurmaRequest {
    escola_id: string;
    professor_id: string;
    nome: string;
    codigo_turma: string;
    ano_lectivo: number;
    trimestre: 1 | 2 | 3;
    nivel_ensino: string;
    sala?: number;
    turno?: 'manhã' | 'tarde' | 'noite';
    capacidade_maxima?: number;
}

export interface CreateComponenteRequest {
    disciplina_id: string;
    turma_id: string;
    nome: string;
    codigo_componente: string;
    peso_percentual: number;
    escala_minima?: number;
    escala_maxima?: number;
    obrigatorio?: boolean;
    ordem?: number;
    descricao?: string;
}

export interface CreateFormulaRequest {
    turma_id: string;
    disciplina_id: string;
    expressao: string;
}

export interface SubmitGradeRequest {
    aluno_id: string;
    componente_id: string;
    turma_id: string;
    valor: number;
    observacao?: string;
}

export interface CalculateFinalGradeRequest {
    aluno_id: string;
    turma_id: string;
    disciplina_id: string;
    trimestre: 1 | 2 | 3;
}

export interface CalculateFinalGradeResponse {
    success: boolean;
    data?: NotaFinal;
    error?: string;
}

export interface GenerateReportRequest {
    turma_id: string;
    disciplina_id: string;
    trimestre: 1 | 2 | 3;
}

export interface GenerateReportResponse {
    success: boolean;
    data?: MiniPauta;
    error?: string;
}

export interface ImportCSVRequest {
    turma_id: string;
    disciplina_id: string;
    csv_data: string;
}

export interface ImportCSVResponse {
    success: boolean;
    imported: number;
    errors: ImportError[];
}

export interface ImportError {
    row: number;
    field: string;
    message: string;
}

// ============================================
// FRONTEND STATE TYPES
// ============================================

export interface UserProfile {
    id: string;
    email: string;
    role: 'professor' | 'aluno' | 'admin';
    profile: Professor | Aluno | null;
}

export interface AppState {
    user: UserProfile | null;
    currentTurma: Turma | null;
    currentDisciplina: Disciplina | null;
    loading: boolean;
    error: string | null;
}

export interface FormulaBuilderState {
    expressao: string;
    componentes: ComponenteAvaliacao[];
    validacao: {
        valida: boolean;
        mensagem: string;
    };
    preview: CalculoDetalhado | null;
}

export interface GradeEntryState {
    alunos: Aluno[];
    componente: ComponenteAvaliacao;
    notas: Record<string, number>;
    saving: boolean;
    errors: Record<string, string>;
}

// ============================================
// VIEW TYPES (from database views)
// ============================================

export interface ViewMiniPauta {
    turma_id: string;
    turma_nome: string;
    codigo_turma: string;
    ano_lectivo: number;
    trimestre: number;
    disciplina_id: string;
    disciplina_nome: string;
    aluno_id: string;
    aluno_nome: string;
    numero_processo: string;
    nota_final: number;
    classificacao: string;
    calculo_detalhado: CalculoDetalhado;
    data_calculo: string;
    professor_nome: string;
    escola_nome: string;
}

export interface ViewEstatisticasTurma {
    turma_id: string;
    turma_nome: string;
    codigo_turma: string;
    disciplina_id: string;
    disciplina_nome: string;
    trimestre: number;
    ano_lectivo: number;
    total_alunos: number;
    media_turma: number;
    nota_minima: number;
    nota_maxima: number;
    aprovados: number;
    reprovados: number;
    taxa_aprovacao: number;
}

export interface ViewDesempenhoAluno {
    aluno_id: string;
    aluno_nome: string;
    numero_processo: string;
    turma_id: string;
    turma_nome: string;
    disciplina_id: string;
    disciplina_nome: string;
    componente_nome: string;
    nota_componente: number;
    nota_final: number;
    classificacao: string;
    trimestre: number;
    ano_lectivo: number;
}

// ============================================
// UTILITY TYPES
// ============================================

export type Trimestre = 1 | 2 | 3;
export type Genero = 'M' | 'F' | 'Outro';
export type Turno = 'manhã' | 'tarde' | 'noite';
export type Classificacao = 'Excelente' | 'Bom' | 'Suficiente' | 'Insuficiente';
export type UserRole = 'professor' | 'aluno' | 'admin';
export type OperacaoAuditoria = 'INSERT' | 'UPDATE' | 'DELETE';
