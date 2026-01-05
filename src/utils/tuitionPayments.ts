import { supabase } from '../lib/supabaseClient'
import type {
    PropinasConfig,
    PagamentoPropina,
    PagamentoMesStatus,
    EstatisticasPropinas,
    RegistarPagamentoRequest,
    MesReferencia,
    Aluno
} from '../types'

/**
 * Tuition Payment Utility Functions
 * Provides API functions for tuition/propinas management
 */

// ============================================
// CONFIGURATION
// ============================================

/**
 * Fetch tuition configuration for a school
 */
export async function fetchPropinasConfig(
    escolaId: string,
    anoLectivo?: number
): Promise<PropinasConfig[]> {
    try {
        const ano = anoLectivo || new Date().getFullYear()

        const { data, error } = await supabase
            .from('propinas_config')
            .select('*, turmas(id, nome, codigo_turma)')
            .eq('escola_id', escolaId)
            .eq('ano_lectivo', ano)
            .eq('ativo', true)
            .order('created_at', { ascending: false })

        if (error) throw error

        // Map turmas to turma field for type compatibility
        return (data || []).map(item => ({
            ...item,
            turma: item.turmas
        }))
    } catch (error) {
        console.error('Error fetching propinas config:', error)
        throw error
    }
}

/**
 * Create or update tuition configuration
 */
export async function savePropinasConfig(config: {
    escola_id: string
    turma_id?: string
    ano_lectivo: number
    valor_mensalidade: number
    descricao?: string
}): Promise<PropinasConfig> {
    try {
        // Check if config exists
        const { data: existing } = await supabase
            .from('propinas_config')
            .select('id')
            .eq('escola_id', config.escola_id)
            .eq('ano_lectivo', config.ano_lectivo)
            .is('turma_id', config.turma_id || null)
            .single()

        if (existing) {
            // Update existing
            const { data, error } = await supabase
                .from('propinas_config')
                .update({
                    valor_mensalidade: config.valor_mensalidade,
                    descricao: config.descricao,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single()

            if (error) throw error
            return data as PropinasConfig
        } else {
            // Create new
            const { data, error } = await supabase
                .from('propinas_config')
                .insert({
                    escola_id: config.escola_id,
                    turma_id: config.turma_id || null,
                    ano_lectivo: config.ano_lectivo,
                    valor_mensalidade: config.valor_mensalidade,
                    descricao: config.descricao,
                    ativo: true
                })
                .select()
                .single()

            if (error) throw error
            return data as PropinasConfig
        }
    } catch (error) {
        console.error('Error saving propinas config:', error)
        throw error
    }
}

// ============================================
// PAYMENTS
// ============================================

/**
 * Fetch payments for a school with optional filters
 */
export async function fetchPagamentosPropinas(
    escolaId: string,
    filters?: {
        turmaId?: string
        mesReferencia?: MesReferencia
        anoReferencia?: number
        alunoId?: string
    }
): Promise<PagamentoPropina[]> {
    try {
        let query = supabase
            .from('pagamentos_propinas')
            .select(`
                *,
                alunos!inner(
                    id, nome_completo, numero_processo, turma_id,
                    turmas(id, nome, codigo_turma)
                )
            `)
            .eq('escola_id', escolaId)
            .order('data_pagamento', { ascending: false })

        if (filters?.anoReferencia) {
            query = query.eq('ano_referencia', filters.anoReferencia)
        }
        if (filters?.mesReferencia) {
            query = query.eq('mes_referencia', filters.mesReferencia)
        }
        if (filters?.alunoId) {
            query = query.eq('aluno_id', filters.alunoId)
        }
        if (filters?.turmaId) {
            query = query.eq('alunos.turma_id', filters.turmaId)
        }

        const { data, error } = await query

        if (error) throw error

        // Map alunos to aluno field
        return (data || []).map(item => ({
            ...item,
            aluno: item.alunos
        }))
    } catch (error) {
        console.error('Error fetching pagamentos:', error)
        throw error
    }
}

/**
 * Fetch payment status by month for a student
 */
export async function fetchPagamentosAlunoPorMes(
    alunoId: string,
    ano?: number
): Promise<PagamentoMesStatus[]> {
    try {
        const { data, error } = await supabase.rpc('get_pagamentos_aluno_por_mes', {
            p_aluno_id: alunoId,
            p_ano: ano || new Date().getFullYear()
        })

        if (error) throw error
        return data as PagamentoMesStatus[]
    } catch (error) {
        console.error('Error fetching pagamentos por mes:', error)
        throw error
    }
}

/**
 * Generate receipt number
 */
export async function gerarNumeroRecibo(escolaId: string): Promise<string> {
    try {
        const { data, error } = await supabase.rpc('gerar_numero_recibo', {
            p_escola_id: escolaId
        })

        if (error) throw error
        return data as string
    } catch (error) {
        console.error('Error generating receipt number:', error)
        throw error
    }
}

/**
 * Register a new tuition payment
 */
export async function registarPagamento(
    request: RegistarPagamentoRequest
): Promise<PagamentoPropina> {
    try {
        // Generate receipt number
        const numero_recibo = await gerarNumeroRecibo(request.escola_id)

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()

        const { data, error } = await supabase
            .from('pagamentos_propinas')
            .insert({
                aluno_id: request.aluno_id,
                escola_id: request.escola_id,
                mes_referencia: request.mes_referencia,
                ano_referencia: request.ano_referencia,
                valor: request.valor,
                metodo_pagamento: request.metodo_pagamento,
                observacao: request.observacao,
                numero_recibo,
                registado_por: user?.id,
                data_pagamento: new Date().toISOString()
            })
            .select(`
                *,
                alunos(id, nome_completo, numero_processo, turma_id)
            `)
            .single()

        if (error) {
            // Check for duplicate payment
            if (error.code === '23505') {
                throw new Error('Já existe um pagamento registado para este aluno neste mês')
            }
            throw error
        }

        return {
            ...data,
            aluno: data.alunos
        } as PagamentoPropina
    } catch (error) {
        console.error('Error registering payment:', error)
        throw error
    }
}

/**
 * Delete a payment (only if recently created, within 24 hours)
 */
export async function anularPagamento(pagamentoId: string): Promise<void> {
    try {
        // First check if payment is recent (within 24 hours)
        const { data: pagamento, error: fetchError } = await supabase
            .from('pagamentos_propinas')
            .select('created_at')
            .eq('id', pagamentoId)
            .single()

        if (fetchError) throw fetchError

        const createdAt = new Date(pagamento.created_at)
        const hoursSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60)

        if (hoursSinceCreation > 24) {
            throw new Error('Só é possível anular pagamentos registados há menos de 24 horas')
        }

        const { error } = await supabase
            .from('pagamentos_propinas')
            .delete()
            .eq('id', pagamentoId)

        if (error) throw error
    } catch (error) {
        console.error('Error canceling payment:', error)
        throw error
    }
}

// ============================================
// STATISTICS
// ============================================

/**
 * Fetch tuition payment statistics for a school
 */
export async function fetchEstatisticasPropinas(
    escolaId: string,
    ano?: number
): Promise<EstatisticasPropinas> {
    try {
        const { data, error } = await supabase.rpc('get_estatisticas_propinas', {
            p_escola_id: escolaId,
            p_ano: ano || new Date().getFullYear()
        })

        if (error) throw error

        // RPC returns an array, get first row
        const stats = Array.isArray(data) ? data[0] : data

        return {
            total_alunos: stats?.total_alunos || 0,
            total_previsto: stats?.total_previsto || 0,
            total_recebido: stats?.total_recebido || 0,
            total_em_falta: stats?.total_em_falta || 0,
            percentagem_recebido: stats?.percentagem_recebido || 0
        }
    } catch (error) {
        console.error('Error fetching estatisticas:', error)
        // Return empty stats on error
        return {
            total_alunos: 0,
            total_previsto: 0,
            total_recebido: 0,
            total_em_falta: 0,
            percentagem_recebido: 0
        }
    }
}

/**
 * Fetch students with their payment status for current year
 */
export async function fetchAlunosComStatusPagamento(
    escolaId: string,
    turmaId?: string,
    ano?: number
): Promise<Array<Aluno & { pagamentos: PagamentoMesStatus[] }>> {
    try {
        const currentYear = ano || new Date().getFullYear()

        // First get students
        // Note: ano_lectivo is TEXT and can be "2025" or "2025/2026"
        let query = supabase
            .from('alunos')
            .select(`
                *,
                turmas!inner(id, nome, codigo_turma, escola_id, ano_lectivo)
            `)
            .eq('turmas.escola_id', escolaId)
            .ilike('turmas.ano_lectivo', `${currentYear}%`)
            .eq('ativo', true)
            .order('nome_completo')

        if (turmaId) {
            query = query.eq('turma_id', turmaId)
        }

        const { data: alunos, error: alunosError } = await query

        if (alunosError) throw alunosError

        // For each student, get payment status
        const alunosComPagamentos = await Promise.all(
            (alunos || []).map(async (aluno) => {
                const pagamentos = await fetchPagamentosAlunoPorMes(aluno.id, currentYear)
                return {
                    ...aluno,
                    turma: aluno.turmas,
                    pagamentos
                }
            })
        )

        return alunosComPagamentos
    } catch (error) {
        console.error('Error fetching alunos com status:', error)
        throw error
    }
}

// ============================================
// HELPERS
// ============================================

/**
 * Get month name in Portuguese
 */
export function getNomeMes(mes: number): string {
    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril',
        'Maio', 'Junho', 'Julho', 'Agosto',
        'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    return meses[mes - 1] || ''
}

/**
 * Get short month name in Portuguese
 */
export function getNomeMesCurto(mes: number): string {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    return meses[mes - 1] || ''
}

/**
 * Format currency in Angolan Kwanza
 */
export function formatarValor(valor: number): string {
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
        minimumFractionDigits: 2
    }).format(valor)
}

/**
 * Get method of payment label
 */
export function getMetodoPagamentoLabel(metodo: string): string {
    const labels: Record<string, string> = {
        'numerario': 'Numerário',
        'transferencia': 'Transferência Bancária',
        'deposito': 'Depósito Bancário'
    }
    return labels[metodo] || metodo
}
