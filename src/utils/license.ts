import { supabase } from '../lib/supabaseClient'
import type {
    Licenca,
    TransacaoPagamento,
    PrecoLicenca,
    LicenseStatus,
    LicenseStats,
    PlanoLicenca,
    CreatePaymentRequest,
    CreatePaymentResponse
} from '../types'

/**
 * License Management Utility Functions
 * Provides API functions for license and payment operations
 */

// ============================================
// LICENSE STATUS & QUERIES
// ============================================

/**
 * Check license status for a school
 */
export async function checkLicenseStatus(escolaId: string): Promise<LicenseStatus> {
    try {
        // Try Edge Function first for consistent logic
        const { data, error } = await supabase.functions.invoke('check-license-status', {
            body: { escola_id: escolaId }
        })

        if (error) {
            console.warn('Edge function failed, falling back to direct query:', error)
            return await checkLicenseStatusDirect(escolaId)
        }

        return data as LicenseStatus
    } catch (error) {
        console.error('Error checking license status:', error)
        return await checkLicenseStatusDirect(escolaId)
    }
}

/**
 * Direct database query for license status (fallback)
 */
async function checkLicenseStatusDirect(escolaId: string): Promise<LicenseStatus> {
    const { data: licenca, error } = await supabase
        .from('licencas')
        .select('*')
        .eq('escola_id', escolaId)
        .eq('estado', 'ativa')
        .order('data_fim', { ascending: false })
        .limit(1)
        .single()

    if (error || !licenca) {
        return {
            valid: false,
            dias_restantes: -1
        }
    }

    const dataFim = new Date(licenca.data_fim)
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    dataFim.setHours(0, 0, 0, 0)

    const diasRestantes = Math.ceil((dataFim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))

    return {
        valid: diasRestantes >= 0,
        dias_restantes: diasRestantes,
        estado: licenca.estado,
        plano: licenca.plano,
        data_fim: licenca.data_fim,
        licenca: licenca
    }
}

/**
 * Fetch all licenses (SUPERADMIN only)
 */
export async function fetchAllLicenses(filters?: {
    estado?: string
    plano?: string
    escolaId?: string
}): Promise<Licenca[]> {
    try {
        let query = supabase
            .from('licencas')
            .select('*, escolas(id, nome, codigo_escola, provincia, municipio)')
            .order('created_at', { ascending: false })

        if (filters?.estado) {
            query = query.eq('estado', filters.estado)
        }
        if (filters?.plano) {
            query = query.eq('plano', filters.plano)
        }
        if (filters?.escolaId) {
            query = query.eq('escola_id', filters.escolaId)
        }

        const { data, error } = await query

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching licenses:', error)
        throw error
    }
}

/**
 * Fetch license for a specific school
 */
export async function fetchSchoolLicense(escolaId: string): Promise<Licenca | null> {
    try {
        const { data, error } = await supabase
            .from('licencas')
            .select('*')
            .eq('escola_id', escolaId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (error && error.code !== 'PGRST116') throw error
        return data
    } catch (error) {
        console.error('Error fetching school license:', error)
        return null
    }
}

// ============================================
// LICENSE MANAGEMENT (SUPERADMIN)
// ============================================

/**
 * Create a manual license (SUPERADMIN only)
 */
export async function createManualLicense(
    escolaId: string,
    plano: PlanoLicenca,
    valor?: number,
    motivo?: string
): Promise<Licenca> {
    try {
        const { data, error } = await supabase.rpc('criar_licenca_manual', {
            p_escola_id: escolaId,
            p_plano: plano,
            p_valor: valor || null,
            p_motivo: motivo || 'Licença criada manualmente pelo SUPERADMIN'
        })

        if (error) throw error
        return data as Licenca
    } catch (error) {
        console.error('Error creating manual license:', error)
        throw error
    }
}

/**
 * Suspend a license (SUPERADMIN only)
 */
export async function suspendLicense(
    licencaId: string,
    motivo?: string
): Promise<Licenca> {
    try {
        const { data, error } = await supabase.rpc('suspender_licenca', {
            p_licenca_id: licencaId,
            p_motivo: motivo || 'Suspensa pelo SUPERADMIN'
        })

        if (error) throw error
        return data as Licenca
    } catch (error) {
        console.error('Error suspending license:', error)
        throw error
    }
}

/**
 * Reactivate a suspended license (SUPERADMIN only)
 */
export async function reactivateLicense(licencaId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('licencas')
            .update({
                estado: 'ativa',
                updated_at: new Date().toISOString()
            })
            .eq('id', licencaId)

        if (error) throw error

        // Unblock the school
        const { data: licenca } = await supabase
            .from('licencas')
            .select('escola_id')
            .eq('id', licencaId)
            .single()

        if (licenca) {
            await supabase
                .from('escolas')
                .update({
                    bloqueado: false,
                    bloqueado_motivo: null,
                    bloqueado_em: null,
                    bloqueado_por: null
                })
                .eq('id', licenca.escola_id)
        }
    } catch (error) {
        console.error('Error reactivating license:', error)
        throw error
    }
}

// ============================================
// PAYMENT OPERATIONS
// ============================================

/**
 * Create a new payment
 */
export async function createPayment(
    request: CreatePaymentRequest
): Promise<CreatePaymentResponse> {
    try {
        const { data, error } = await supabase.functions.invoke('create-payment', {
            body: request
        })

        if (error) throw error
        return data as CreatePaymentResponse
    } catch (error) {
        console.error('Error creating payment:', error)
        throw error
    }
}

/**
 * Fetch payment transactions for a school
 */
export async function fetchTransactions(escolaId?: string): Promise<TransacaoPagamento[]> {
    try {
        let query = supabase
            .from('transacoes_pagamento')
            .select('*, licencas(*), escolas(id, nome, codigo_escola)')
            .order('created_at', { ascending: false })

        if (escolaId) {
            query = query.eq('escola_id', escolaId)
        }

        const { data, error } = await query

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching transactions:', error)
        throw error
    }
}

// ============================================
// PRICING
// ============================================

/**
 * Fetch license prices
 */
export async function fetchPrices(): Promise<PrecoLicenca[]> {
    try {
        const { data, error } = await supabase
            .from('precos_licenca')
            .select('*')
            .eq('ativo', true)
            .order('valor', { ascending: true })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching prices:', error)
        throw error
    }
}

/**
 * Update a license price (SUPERADMIN only)
 */
export async function updatePrice(
    priceId: string,
    updates: {
        valor?: number
        desconto_percentual?: number
        descricao?: string
        ativo?: boolean
    }
): Promise<PrecoLicenca> {
    try {
        const { data, error } = await supabase
            .from('precos_licenca')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', priceId)
            .select()
            .single()

        if (error) throw error
        return data as PrecoLicenca
    } catch (error) {
        console.error('Error updating price:', error)
        throw error
    }
}

// ============================================
// STATISTICS (SUPERADMIN)
// ============================================

/**
 * Fetch license statistics for SUPERADMIN dashboard
 */
export async function fetchLicenseStats(): Promise<LicenseStats> {
    try {
        // Fetch all licenses
        const { data: licencas, error: licError } = await supabase
            .from('licencas')
            .select('id, estado, valor, plano, created_at')

        if (licError) throw licError

        // Fetch blocked schools count
        const { count: escolasBloqueadas, error: bloqError } = await supabase
            .from('escolas')
            .select('id', { count: 'exact' })
            .eq('bloqueado', true)

        if (bloqError) throw bloqError

        // Fetch successful transactions for revenue
        const { data: transacoes, error: transError } = await supabase
            .from('transacoes_pagamento')
            .select('valor, created_at')
            .eq('estado', 'sucesso')

        if (transError) throw transError

        // Calculate statistics
        const total_licencas = licencas?.length || 0
        const licencas_ativas = licencas?.filter(l => l.estado === 'ativa').length || 0
        const licencas_expiradas = licencas?.filter(l => l.estado === 'expirada').length || 0
        const licencas_suspensas = licencas?.filter(l => l.estado === 'suspensa').length || 0

        const receita_total = transacoes?.reduce((sum, t) => sum + (t.valor || 0), 0) || 0

        // Calculate revenue by period
        const now = new Date()
        const trimestre = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
        const semestre = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
        const ano = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())

        const receita_trimestre = transacoes?.filter(t => new Date(t.created_at) >= trimestre)
            .reduce((sum, t) => sum + (t.valor || 0), 0) || 0
        const receita_semestre = transacoes?.filter(t => new Date(t.created_at) >= semestre)
            .reduce((sum, t) => sum + (t.valor || 0), 0) || 0
        const receita_ano = transacoes?.filter(t => new Date(t.created_at) >= ano)
            .reduce((sum, t) => sum + (t.valor || 0), 0) || 0

        // Calculate monthly revenue
        const receitas_por_mes: Array<{ mes: string; ano: number; total: number }> = []
        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const mes = date.toLocaleString('pt-AO', { month: 'short' })
            const anoNum = date.getFullYear()
            const mesNum = date.getMonth()

            const total = transacoes?.filter(t => {
                const tDate = new Date(t.created_at)
                return tDate.getFullYear() === anoNum && tDate.getMonth() === mesNum
            }).reduce((sum, t) => sum + (t.valor || 0), 0) || 0

            receitas_por_mes.push({ mes, ano: anoNum, total })
        }

        return {
            total_licencas,
            licencas_ativas,
            licencas_expiradas,
            licencas_suspensas,
            escolas_bloqueadas_por_falta_pagamento: escolasBloqueadas || 0,
            receita_total,
            receita_trimestre,
            receita_semestre,
            receita_ano,
            receitas_por_mes
        }
    } catch (error) {
        console.error('Error fetching license stats:', error)
        throw error
    }
}

/**
 * Run expired license check (triggers blocking)
 */
export async function runExpirationCheck(): Promise<void> {
    try {
        const { error } = await supabase.rpc('verificar_licencas_expiradas')
        if (error) throw error
    } catch (error) {
        console.error('Error running expiration check:', error)
        throw error
    }
}
