/**
 * Utility functions for managing student enrollments (matrículas)
 * 
 * This module handles:
 * - Generating pending enrollments at end of academic year
 * - Confirming enrollments for promoted students
 * - Confirming repeating for non-promoted students
 * - Managing extraordinary exams for conditional students
 */

import { supabase } from '../lib/supabaseClient'
import { Matricula, StatusTransicao, EstadoMatricula, Aluno, Turma } from '../types'
import { classifyStudent, DisciplinaGrade, ClassificationResult } from './studentClassification'

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Determine the next class level based on current class
 * @param classeAtual - Current class (e.g., "7ª Classe")
 * @returns Next class (e.g., "8ª Classe")
 */
export function determinarProximaClasse(classeAtual: string): string {
    const match = classeAtual.match(/(\d+)[ªº]\s*Classe/i)
    if (!match) return classeAtual

    const numeroAtual = parseInt(match[1], 10)
    const proximoNumero = numeroAtual + 1

    // Maximum is 12ª Classe
    if (proximoNumero > 12) return classeAtual

    return `${proximoNumero}ª Classe`
}

/**
 * Extract class from turma name (e.g., "10ª Classe A" -> "10ª Classe")
 */
export function extrairClasse(turmaNome: string): string | undefined {
    const match = turmaNome.match(/(\d+[ªº]\s*Classe)/i)
    return match ? match[1] : undefined
}

/**
 * Calculate next academic year
 * @param anoAtual - Current year (e.g., "2025" or "2025/2026")
 */
export function calcularProximoAnoLectivo(anoAtual: string): string {
    // Handle format "2025" or "2025/2026"
    const match = anoAtual.match(/(\d{4})/)
    if (!match) return anoAtual

    const ano = parseInt(match[1], 10)
    return `${ano + 1}`
}

// ============================================
// MATRICULA OPERATIONS
// ============================================

export interface MatriculaComAluno extends Matricula {
    aluno: Aluno & {
        turma?: Turma
    }
    turma_origem?: Turma
}

/**
 * Load all pending enrollments for a school/year
 */
export async function carregarMatriculasPendentes(
    escolaId: string,
    anoLectivoOrigem?: string
): Promise<MatriculaComAluno[]> {
    let query = supabase
        .from('matriculas')
        .select(`
            *,
            aluno:alunos!aluno_id (
                id,
                nome_completo,
                numero_processo,
                genero,
                frequencia_anual,
                turma:turmas!turma_id (
                    id,
                    nome,
                    nivel_ensino,
                    ano_lectivo
                )
            ),
            turma_origem:turmas!turma_origem_id (
                id,
                nome,
                nivel_ensino,
                ano_lectivo
            ),
            turma_destino:turmas!turma_destino_id (
                id,
                nome,
                nivel_ensino,
                ano_lectivo
            )
        `)
        .eq('escola_id', escolaId)
        .order('created_at', { ascending: false })

    if (anoLectivoOrigem) {
        query = query.eq('ano_lectivo_origem', anoLectivoOrigem)
    }

    const { data, error } = await query

    if (error) throw error
    return (data || []) as MatriculaComAluno[]
}

/**
 * Generate pending enrollments for all students in a class
 * This calls the database function gerar_matriculas_pendentes
 */
export async function gerarMatriculasPendentes(
    turmaId: string,
    anoLectivoDestino: string
): Promise<number> {
    const { data, error } = await supabase
        .rpc('gerar_matriculas_pendentes', {
            p_turma_id: turmaId,
            p_ano_lectivo_destino: anoLectivoDestino
        })

    if (error) throw error
    return data as number
}

/**
 * Update matricula with classification data from frontend calculation
 */
export async function atualizarClassificacaoMatricula(
    matriculaId: string,
    classification: ClassificationResult,
    mediaGeral: number,
    classeOrigem?: string
): Promise<void> {
    const { error } = await supabase
        .from('matriculas')
        .update({
            status_transicao: classification.status,
            disciplinas_em_risco: classification.disciplinas_em_risco,
            observacao_padronizada: classification.observacao_padronizada,
            motivo_retencao: classification.motivo_retencao,
            matricula_condicional: classification.matricula_condicional,
            media_geral: mediaGeral,
            classe_origem: classeOrigem,
            classe_destino: classification.status === 'Transita' || classification.status === 'Condicional'
                ? (classeOrigem ? determinarProximaClasse(classeOrigem) : null)
                : classeOrigem, // Non-promoted stays in same class
            // If conditional, set to aguardando_exame
            estado_matricula: classification.status === 'Condicional' ? 'aguardando_exame' : 'pendente',
            updated_at: new Date().toISOString()
        })
        .eq('id', matriculaId)

    if (error) throw error
}

/**
 * Confirm enrollment for a promoted student
 * Creates the student in the destination class
 */
export async function confirmarMatricula(
    matriculaId: string,
    turmaDestinoId: string,
    classeDestino?: string
): Promise<void> {
    const { error } = await supabase
        .rpc('confirmar_matricula', {
            p_matricula_id: matriculaId,
            p_turma_destino_id: turmaDestinoId,
            p_classe_destino: classeDestino
        })

    if (error) throw error
}

/**
 * Confirm repeating for a non-promoted student
 * Student stays in the same class level
 */
export async function confirmarRepetencia(
    matriculaId: string,
    turmaDestinoId: string
): Promise<void> {
    // For repeating students, we use the same function but the destination
    // class is the same as origin class
    const { error } = await supabase
        .rpc('confirmar_matricula', {
            p_matricula_id: matriculaId,
            p_turma_destino_id: turmaDestinoId,
            p_classe_destino: null // Will be inferred from turma
        })

    if (error) throw error
}

/**
 * Register extraordinary exam result for conditional student
 */
export async function registrarResultadoExame(
    matriculaId: string,
    resultado: 'aprovado' | 'reprovado',
    nota: number,
    dataExame?: Date,
    observacao?: string
): Promise<void> {
    const { error } = await supabase
        .rpc('registrar_resultado_exame', {
            p_matricula_id: matriculaId,
            p_resultado: resultado,
            p_nota: nota,
            p_data_exame: dataExame?.toISOString().split('T')[0],
            p_observacao: observacao
        })

    if (error) throw error
}

/**
 * Confirm multiple enrollments at once (batch operation)
 */
export async function confirmarMatriculasEmLote(
    matriculaIds: string[],
    turmaDestinoId: string
): Promise<{ success: number; errors: Array<{ id: string; error: string }> }> {
    const results = {
        success: 0,
        errors: [] as Array<{ id: string; error: string }>
    }

    for (const matriculaId of matriculaIds) {
        try {
            await confirmarMatricula(matriculaId, turmaDestinoId)
            results.success++
        } catch (err) {
            results.errors.push({
                id: matriculaId,
                error: err instanceof Error ? err.message : 'Erro desconhecido'
            })
        }
    }

    return results
}

/**
 * Get available destination classes for enrollment
 * Returns classes for the next academic year
 */
export async function carregarTurmasDestino(
    escolaId: string,
    anoLectivoDestino: string,
    nivelEnsino?: string
): Promise<Turma[]> {
    let query = supabase
        .from('turmas')
        .select('*')
        .eq('escola_id', escolaId)
        .eq('ano_lectivo', anoLectivoDestino)
        .order('nome')

    if (nivelEnsino) {
        query = query.eq('nivel_ensino', nivelEnsino)
    }

    const { data, error } = await query

    if (error) throw error
    return (data || []) as Turma[]
}

/**
 * Cancel a pending enrollment
 */
export async function cancelarMatricula(matriculaId: string): Promise<void> {
    const { error } = await supabase
        .from('matriculas')
        .update({
            estado_matricula: 'cancelada',
            updated_at: new Date().toISOString()
        })
        .eq('id', matriculaId)
        .eq('estado_matricula', 'pendente') // Can only cancel pending

    if (error) throw error
}

/**
 * Get enrollment statistics for a school/year
 */
export async function carregarResumoMatriculas(
    escolaId: string,
    anoLectivoOrigem: string
): Promise<{
    total: number
    transitados: number
    naoTransitados: number
    condicionais: number
    pendentes: number
    confirmadas: number
    aguardandoExame: number
}> {
    const { data, error } = await supabase
        .from('matriculas')
        .select('status_transicao, estado_matricula')
        .eq('escola_id', escolaId)
        .eq('ano_lectivo_origem', anoLectivoOrigem)

    if (error) throw error

    const matriculas = data || []

    return {
        total: matriculas.length,
        transitados: matriculas.filter(m => m.status_transicao === 'Transita').length,
        naoTransitados: matriculas.filter(m => m.status_transicao === 'Não Transita').length,
        condicionais: matriculas.filter(m => m.status_transicao === 'Condicional').length,
        pendentes: matriculas.filter(m => m.estado_matricula === 'pendente').length,
        confirmadas: matriculas.filter(m => m.estado_matricula === 'confirmada').length,
        aguardandoExame: matriculas.filter(m => m.estado_matricula === 'aguardando_exame').length
    }
}

// ============================================
// GRADE CALCULATION HELPERS
// ============================================

/**
 * Calculate classification for all students in a class
 * This integrates with the existing studentClassification.ts
 */
export interface AlunoComClassificacao {
    aluno: Aluno
    disciplinaGrades: DisciplinaGrade[]
    classification: ClassificationResult
    mediaGeral: number
}

export async function calcularClassificacaoTurma(
    turmaId: string,
    nivelEnsino: string,
    classe: string,
    disciplinasObrigatorias: string[]
): Promise<AlunoComClassificacao[]> {
    // Load students
    const { data: alunos, error: alunosError } = await supabase
        .from('alunos')
        .select('*')
        .eq('turma_id', turmaId)
        .eq('ativo', true)
        .order('nome_completo')

    if (alunosError) throw alunosError

    // Load disciplines
    const { data: disciplinas, error: discError } = await supabase
        .from('disciplinas')
        .select('id, nome')
        .eq('turma_id', turmaId)

    if (discError) throw discError

    // Load components (MF or MFD)
    const { data: componentes, error: compError } = await supabase
        .from('componentes_avaliacao')
        .select('id, disciplina_id, codigo_componente')
        .eq('turma_id', turmaId)
        .in('codigo_componente', ['MF', 'MFD'])

    if (compError) throw compError

    // Map component to discipline
    const componenteDisciplinaMap = new Map<string, { disciplinaId: string; disciplinaNome: string }>()
    componentes?.forEach(comp => {
        const disc = disciplinas?.find(d => d.id === comp.disciplina_id)
        if (disc) {
            componenteDisciplinaMap.set(comp.id, { disciplinaId: disc.id, disciplinaNome: disc.nome })
        }
    })

    // Load grades for these components
    const componenteIds = componentes?.map(c => c.id) || []
    const { data: notas, error: notasError } = await supabase
        .from('notas')
        .select('aluno_id, componente_id, valor')
        .eq('turma_id', turmaId)
        .in('componente_id', componenteIds)

    if (notasError) throw notasError

    // Calculate for each student
    const results: AlunoComClassificacao[] = []

    for (const aluno of alunos || []) {
        const alunoNotas = notas?.filter(n => n.aluno_id === aluno.id) || []

        // Build discipline grades
        const disciplinaGrades: DisciplinaGrade[] = []
        const notasFinais: number[] = []

        alunoNotas.forEach(nota => {
            const discInfo = componenteDisciplinaMap.get(nota.componente_id)
            if (discInfo) {
                disciplinaGrades.push({
                    id: discInfo.disciplinaId,
                    nome: discInfo.disciplinaNome,
                    nota: nota.valor
                })
                notasFinais.push(nota.valor)
            }
        })

        // Calculate classification
        const classification = classifyStudent(
            disciplinaGrades,
            nivelEnsino,
            classe,
            disciplinasObrigatorias,
            aluno.frequencia_anual
        )

        // Calculate average
        const mediaGeral = notasFinais.length > 0
            ? Math.round((notasFinais.reduce((a, b) => a + b, 0) / notasFinais.length) * 100) / 100
            : 0

        results.push({
            aluno,
            disciplinaGrades,
            classification,
            mediaGeral
        })
    }

    return results
}
