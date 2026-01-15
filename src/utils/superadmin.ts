import { supabase } from '../lib/supabaseClient'
import type { SuperAdminStats, SuperAdminAction, Escola, EscolaBackup, SystemVisit, SystemVisitStats } from '../types'

/**
 * SUPERADMIN Utility Functions
 * Provides API functions for SUPERADMIN operations
 */

// ============================================
// SYSTEM VISIT TRACKING FUNCTIONS
// ============================================

/**
 * Detect device type from user agent
 */
function detectDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' | 'unknown' {
    if (!userAgent) return 'unknown'
    const ua = userAgent.toLowerCase()
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
    if (/mobile|iphone|ipod|android|blackberry|opera mini|windows phone/i.test(ua)) return 'mobile'
    if (/windows|macintosh|linux/i.test(ua)) return 'desktop'
    return 'unknown'
}

/**
 * Detect browser from user agent
 */
function detectBrowser(userAgent: string): string {
    if (!userAgent) return 'unknown'
    const ua = userAgent.toLowerCase()
    if (ua.includes('edg/')) return 'Edge'
    if (ua.includes('chrome')) return 'Chrome'
    if (ua.includes('firefox')) return 'Firefox'
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari'
    if (ua.includes('opera') || ua.includes('opr/')) return 'Opera'
    return 'unknown'
}

/**
 * Detect OS from user agent
 */
function detectOS(userAgent: string): string {
    if (!userAgent) return 'unknown'
    const ua = userAgent.toLowerCase()
    if (ua.includes('windows')) return 'Windows'
    if (ua.includes('mac')) return 'macOS'
    if (ua.includes('linux')) return 'Linux'
    if (ua.includes('android')) return 'Android'
    if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS'
    return 'unknown'
}

/**
 * Log a system visit (call after successful login)
 */
export async function logSystemVisit(
    escolaId?: string,
    tipoPerfil?: string
): Promise<void> {
    try {
        const userAgent = navigator.userAgent
        const deviceType = detectDeviceType(userAgent)
        const browser = detectBrowser(userAgent)
        const os = detectOS(userAgent)

        const { error } = await supabase.rpc('log_system_visit', {
            p_escola_id: escolaId || null,
            p_tipo_perfil: tipoPerfil || null,
            p_device_type: deviceType,
            p_browser: browser,
            p_os: os
        })

        if (error) {
            console.error('Error logging system visit:', error)
            // Don't throw - logging failure shouldn't break the main operation
        }
    } catch (error) {
        console.error('Error logging system visit:', error)
        // Don't throw - logging failure shouldn't break the main operation
    }
}

/**
 * Fetch system visit statistics for SuperAdmin dashboard
 */
export async function fetchSystemVisitStats(): Promise<SystemVisitStats | null> {
    try {
        const { data, error } = await supabase
            .from('system_visit_stats')
            .select('*')
            .single()

        if (error) {
            console.error('Error fetching visit stats:', error)
            return null
        }

        return data as SystemVisitStats
    } catch (error) {
        console.error('Error fetching visit stats:', error)
        return null
    }
}

/**
 * Fetch system visits with filters (for SuperAdmin)
 */
export async function fetchSystemVisits(filters?: {
    tipoPerfil?: string
    escolaId?: string
    startDate?: string
    endDate?: string
    deviceType?: string
    limit?: number
}): Promise<SystemVisit[]> {
    try {
        let query = supabase
            .from('system_visits')
            .select(`
                *,
                escolas:escola_id (nome)
            `)
            .order('created_at', { ascending: false })

        if (filters?.tipoPerfil) {
            query = query.eq('tipo_perfil', filters.tipoPerfil)
        }

        if (filters?.escolaId) {
            query = query.eq('escola_id', filters.escolaId)
        }

        if (filters?.startDate) {
            query = query.gte('created_at', filters.startDate)
        }

        if (filters?.endDate) {
            query = query.lte('created_at', filters.endDate)
        }

        if (filters?.deviceType) {
            query = query.eq('device_type', filters.deviceType)
        }

        if (filters?.limit) {
            query = query.limit(filters.limit)
        } else {
            query = query.limit(100)
        }

        const { data, error } = await query

        if (error) throw error

        // Map escola name from joined data
        return (data || []).map(visit => ({
            ...visit,
            escola_nome: visit.escolas?.nome
        }))
    } catch (error) {
        console.error('Error fetching system visits:', error)
        throw error
    }
}

/**
 * Fetch system-wide statistics for SUPERADMIN dashboard
 */
export async function fetchSuperAdminStats(): Promise<SuperAdminStats> {
    try {
        // Fetch all escolas
        const { data: escolas, error: escolasError } = await supabase
            .from('escolas')
            .select('id, provincia, municipio, ativo, bloqueado, created_at')

        if (escolasError) throw escolasError

        const total_escolas = escolas?.length || 0
        const escolas_ativas = escolas?.filter(e => e.ativo && !e.bloqueado).length || 0
        const escolas_inativas = escolas?.filter(e => !e.ativo).length || 0
        const escolas_bloqueadas = escolas?.filter(e => e.bloqueado).length || 0

        // Calculate statistics by province
        const estatisticas_por_provincia: Record<string, number> = {}
        escolas?.forEach(escola => {
            const provincia = escola.provincia || 'Desconhecido'
            estatisticas_por_provincia[provincia] = (estatisticas_por_provincia[provincia] || 0) + 1
        })

        // Calculate statistics by municipality
        const estatisticas_por_municipio: Record<string, number> = {}
        escolas?.forEach(escola => {
            const municipio = escola.municipio || 'Desconhecido'
            estatisticas_por_municipio[municipio] = (estatisticas_por_municipio[municipio] || 0) + 1
        })

        // Calculate monthly growth (last 12 months)
        const crescimento_mensal: Array<{ mes: string; ano: number; total: number }> = []
        const now = new Date()

        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const mes = date.toLocaleString('pt-AO', { month: 'short' })
            const ano = date.getFullYear()

            const total = escolas?.filter(e => {
                const createdDate = new Date(e.created_at)
                return createdDate.getFullYear() === ano &&
                    createdDate.getMonth() === date.getMonth()
            }).length || 0

            crescimento_mensal.push({ mes, ano, total })
        }

        return {
            total_escolas,
            escolas_ativas,
            escolas_inativas,
            escolas_bloqueadas,
            estatisticas_por_provincia,
            estatisticas_por_municipio,
            crescimento_mensal
        }
    } catch (error) {
        console.error('Error fetching SUPERADMIN stats:', error)
        throw error
    }
}

/**
 * Fetch all escolas with optional filters
 */
export async function fetchAllEscolas(filters?: {
    ativo?: boolean
    bloqueado?: boolean
    provincia?: string
    municipio?: string
    search?: string
    needsAttention?: boolean
}): Promise<Escola[]> {
    try {
        let query = supabase.from('escolas').select('*')

        // If needsAttention filter is active, we need to fetch schools that are inactive OR blocked
        if (filters?.needsAttention) {
            // Use OR filter: ativo = false OR bloqueado = true
            query = query.or('ativo.eq.false,bloqueado.eq.true')
        } else {
            if (filters?.ativo !== undefined) {
                query = query.eq('ativo', filters.ativo)
            }

            if (filters?.bloqueado !== undefined) {
                query = query.eq('bloqueado', filters.bloqueado)
            }
        }

        if (filters?.provincia) {
            query = query.eq('provincia', filters.provincia)
        }

        if (filters?.municipio) {
            query = query.eq('municipio', filters.municipio)
        }

        if (filters?.search) {
            query = query.or(`nome.ilike.%${filters.search}%,codigo_escola.ilike.%${filters.search}%`)
        }

        const { data, error } = await query.order('created_at', { ascending: false })

        if (error) throw error

        return data || []
    } catch (error) {
        console.error('Error fetching escolas:', error)
        throw error
    }
}


/**
 * Activate a school
 */
export async function activateEscola(escolaId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('escolas')
            .update({ ativo: true })
            .eq('id', escolaId)

        if (error) throw error

        // Log the action
        await logSuperAdminAction('ACTIVATE_ESCOLA', escolaId, {
            action: 'Escola activated',
            escola_id: escolaId
        })
    } catch (error) {
        console.error('Error activating escola:', error)
        throw error
    }
}

/**
 * Deactivate a school
 */
export async function deactivateEscola(escolaId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('escolas')
            .update({ ativo: false })
            .eq('id', escolaId)

        if (error) throw error

        // Log the action
        await logSuperAdminAction('DEACTIVATE_ESCOLA', escolaId, {
            action: 'Escola deactivated',
            escola_id: escolaId
        })
    } catch (error) {
        console.error('Error deactivating escola:', error)
        throw error
    }
}

/**
 * Block a school with reason (uses RPC to bypass RLS)
 */
export async function blockEscola(escolaId: string, motivo: string): Promise<void> {
    console.log('🚫 blockEscola called with ID:', escolaId)

    try {
        const { data, error } = await supabase.rpc('superadmin_block_escola', {
            p_escola_id: escolaId,
            p_motivo: motivo
        })

        console.log('📝 Block result:', data, 'error:', error)

        if (error) {
            console.error('❌ Supabase RPC error:', error)
            throw error
        }

        if (data && !data.success) {
            throw new Error(data.error || 'Erro ao bloquear escola')
        }

        // Log the action
        await logSuperAdminAction('BLOCK_ESCOLA', escolaId, {
            action: 'Escola blocked',
            escola_id: escolaId,
            motivo: motivo
        })

        console.log('✅ Block operation completed')
    } catch (error) {
        console.error('❌ Error blocking escola:', error)
        throw error
    }
}

/**
 * Unblock a school (uses RPC to bypass RLS)
 */
export async function unblockEscola(escolaId: string): Promise<void> {
    console.log('🔓 unblockEscola called with ID:', escolaId)

    try {
        const { data, error } = await supabase.rpc('superadmin_unblock_escola', {
            p_escola_id: escolaId
        })

        console.log('📝 Unblock result:', data, 'error:', error)

        if (error) {
            console.error('❌ Supabase RPC error:', error)
            throw error
        }

        if (data && !data.success) {
            throw new Error(data.error || 'Erro ao desbloquear escola')
        }

        // Log the action
        await logSuperAdminAction('UNBLOCK_ESCOLA', escolaId, {
            action: 'Escola unblocked',
            escola_id: escolaId
        })

        console.log('✅ Unblock operation completed')
    } catch (error) {
        console.error('❌ Error unblocking escola:', error)
        throw error
    }
}



/**
 * Log SUPERADMIN action to audit table
 */
export async function logSuperAdminAction(
    actionType: string,
    escolaId: string | null,
    details: Record<string, any>
): Promise<void> {
    try {
        const { error } = await supabase.rpc('log_superadmin_action', {
            p_action_type: actionType,
            p_target_escola_id: escolaId,
            p_action_details: details
        })

        if (error) {
            console.error('Error logging SUPERADMIN action:', error)
            // Don't throw - logging failure shouldn't break the main operation
        }
    } catch (error) {
        console.error('Error logging SUPERADMIN action:', error)
        // Don't throw - logging failure shouldn't break the main operation
    }
}

/**
 * Fetch SUPERADMIN audit log with filters
 */
export async function fetchSuperAdminAuditLog(filters?: {
    actionType?: string
    escolaId?: string
    startDate?: string
    endDate?: string
    limit?: number
}): Promise<SuperAdminAction[]> {
    try {
        let query = supabase
            .from('superadmin_actions')
            .select('*')
            .order('created_at', { ascending: false })

        if (filters?.actionType) {
            query = query.eq('action_type', filters.actionType)
        }

        if (filters?.escolaId) {
            query = query.eq('target_escola_id', filters.escolaId)
        }

        if (filters?.startDate) {
            query = query.gte('created_at', filters.startDate)
        }

        if (filters?.endDate) {
            query = query.lte('created_at', filters.endDate)
        }

        if (filters?.limit) {
            query = query.limit(filters.limit)
        }

        const { data, error } = await query

        if (error) throw error

        return data || []
    } catch (error) {
        console.error('Error fetching audit log:', error)
        throw error
    }
}

/**
 * Update escola details (SUPERADMIN only)
 */
export async function updateEscola(
    escolaId: string,
    updates: Partial<Escola>
): Promise<void> {
    try {
        // Get current escola data for logging
        const { data: currentEscola } = await supabase
            .from('escolas')
            .select('*')
            .eq('id', escolaId)
            .single()

        const { error } = await supabase
            .from('escolas')
            .update(updates)
            .eq('id', escolaId)

        if (error) throw error

        // Log the action
        await logSuperAdminAction('EDIT_ESCOLA', escolaId, {
            action: 'Escola details updated',
            escola_id: escolaId,
            before: currentEscola,
            after: updates
        })
    } catch (error) {
        console.error('Error updating escola:', error)
        throw error
    }
}

/**
 * Delete a school with optional backup
 */
export async function deleteEscola(
    escolaId: string,
    motivo: string,
    createBackup: boolean = true
): Promise<{ success: boolean; backup_id?: string; message?: string; error?: string }> {
    try {
        const { data, error } = await supabase.rpc('backup_and_delete_escola', {
            p_escola_id: escolaId,
            p_motivo: motivo,
            p_create_backup: createBackup
        })

        if (error) throw error

        return data as { success: boolean; backup_id?: string; message?: string; error?: string }
    } catch (error) {
        console.error('Error deleting escola:', error)
        throw error
    }
}

/**
 * Fetch all escola backups
 */
export async function fetchEscolaBackups(filters?: {
    limit?: number
    includeRestored?: boolean
}): Promise<EscolaBackup[]> {
    try {
        const { data, error } = await supabase.rpc('fetch_escola_backups', {
            p_limit: filters?.limit || 50,
            p_include_restored: filters?.includeRestored || false
        })

        if (error) throw error

        return data || []
    } catch (error) {
        console.error('Error fetching escola backups:', error)
        throw error
    }
}

/**
 * Restore a school from backup
 */
export async function restoreEscola(
    backupId: string
): Promise<{ success: boolean; escola_id?: string; message?: string; error?: string }> {
    try {
        const { data, error } = await supabase.rpc('restore_escola_from_backup', {
            p_backup_id: backupId
        })

        if (error) throw error

        return data as { success: boolean; escola_id?: string; message?: string; error?: string }
    } catch (error) {
        console.error('Error restoring escola:', error)
        throw error
    }
}

// ============================================
// DIREÇÃO MUNICIPAL MANAGEMENT FUNCTIONS
// ============================================

export interface DirecaoMunicipal {
    id: string
    user_id: string | null
    nome: string
    provincia: string
    municipio: string
    email: string
    telefone: string | null
    cargo: string
    numero_funcionario: string | null
    ativo: boolean
    bloqueado: boolean
    bloqueado_motivo: string | null
    bloqueado_em: string | null
    bloqueado_por: string | null
    created_at: string
    updated_at: string
}

/**
 * Fetch all direções municipais with optional filters
 */
export async function fetchAllDirecoesMunicipais(filters?: {
    ativo?: boolean
    bloqueado?: boolean
    provincia?: string
    municipio?: string
    search?: string
    needsAttention?: boolean
}): Promise<DirecaoMunicipal[]> {
    try {
        // Log session info for debugging RLS issues
        const { data: { user } } = await supabase.auth.getUser()
        console.log('🔐 fetchAllDirecoesMunicipais - Current user:', user?.id)

        let query = supabase.from('direcoes_municipais').select('*')

        if (filters?.needsAttention) {
            // Needs attention: inactive OR blocked
            query = query.or('ativo.eq.false,bloqueado.eq.true')
        } else {
            if (filters?.ativo !== undefined) {
                query = query.eq('ativo', filters.ativo)
            }

            if (filters?.bloqueado !== undefined) {
                query = query.eq('bloqueado', filters.bloqueado)
            }
        }

        if (filters?.provincia) {
            query = query.eq('provincia', filters.provincia)
        }

        if (filters?.municipio) {
            query = query.eq('municipio', filters.municipio)
        }

        if (filters?.search) {
            query = query.or(`nome.ilike.%${filters.search}%,municipio.ilike.%${filters.search}%,provincia.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
        }

        const { data, error } = await query.order('created_at', { ascending: false })

        console.log('🔍 fetchAllDirecoesMunicipais result:', { data, error, filters })

        if (error) throw error

        return data || []
    } catch (error) {
        console.error('❌ Error fetching direções municipais:', error)
        throw error
    }
}

/**
 * Activate a direção municipal
 */
export async function activateDirecaoMunicipal(direcaoId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('direcoes_municipais')
            .update({ ativo: true })
            .eq('id', direcaoId)

        if (error) throw error

        // Log the action
        await logSuperAdminAction('ACTIVATE_DIRECAO_MUNICIPAL', null, {
            action: 'Direção Municipal activated',
            direcao_id: direcaoId
        })
    } catch (error) {
        console.error('Error activating direção municipal:', error)
        throw error
    }
}

/**
 * Deactivate a direção municipal
 */
export async function deactivateDirecaoMunicipal(direcaoId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('direcoes_municipais')
            .update({ ativo: false })
            .eq('id', direcaoId)

        if (error) throw error

        // Log the action
        await logSuperAdminAction('DEACTIVATE_DIRECAO_MUNICIPAL', null, {
            action: 'Direção Municipal deactivated',
            direcao_id: direcaoId
        })
    } catch (error) {
        console.error('Error deactivating direção municipal:', error)
        throw error
    }
}

/**
 * Block a direção municipal with reason
 */
export async function blockDirecaoMunicipal(direcaoId: string, motivo: string): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser()

        const { error } = await supabase
            .from('direcoes_municipais')
            .update({
                bloqueado: true,
                bloqueado_motivo: motivo,
                bloqueado_em: new Date().toISOString(),
                bloqueado_por: user?.id
            })
            .eq('id', direcaoId)

        if (error) throw error

        // Log the action
        await logSuperAdminAction('BLOCK_DIRECAO_MUNICIPAL', null, {
            action: 'Direção Municipal blocked',
            direcao_id: direcaoId,
            motivo: motivo
        })
    } catch (error) {
        console.error('Error blocking direção municipal:', error)
        throw error
    }
}

/**
 * Unblock a direção municipal
 */
export async function unblockDirecaoMunicipal(direcaoId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('direcoes_municipais')
            .update({
                bloqueado: false,
                bloqueado_motivo: null,
                bloqueado_em: null,
                bloqueado_por: null
            })
            .eq('id', direcaoId)

        if (error) throw error

        // Log the action
        await logSuperAdminAction('UNBLOCK_DIRECAO_MUNICIPAL', null, {
            action: 'Direção Municipal unblocked',
            direcao_id: direcaoId
        })
    } catch (error) {
        console.error('Error unblocking direção municipal:', error)
        throw error
    }
}

// ============================================
// DIREÇÃO PROVINCIAL MANAGEMENT FUNCTIONS
// ============================================

export interface DirecaoProvincial {
    id: string
    user_id: string | null
    nome: string
    provincia: string
    email: string
    telefone: string | null
    cargo: string
    numero_funcionario: string | null
    ativo: boolean
    bloqueado: boolean
    bloqueado_motivo: string | null
    bloqueado_em: string | null
    bloqueado_por: string | null
    created_at: string
    updated_at: string
}

/**
 * Fetch all direções provinciais with optional filters
 */
export async function fetchAllDirecoesProvinciais(filters?: {
    ativo?: boolean
    bloqueado?: boolean
    provincia?: string
    search?: string
    needsAttention?: boolean
}): Promise<DirecaoProvincial[]> {
    try {
        // Log session info for debugging RLS issues
        const { data: { user } } = await supabase.auth.getUser()
        console.log('🔐 fetchAllDirecoesProvinciais - Current user:', user?.id)

        let query = supabase.from('direcoes_provinciais').select('*')

        if (filters?.needsAttention) {
            // Needs attention: inactive OR blocked
            query = query.or('ativo.eq.false,bloqueado.eq.true')
        } else {
            if (filters?.ativo !== undefined) {
                query = query.eq('ativo', filters.ativo)
            }

            if (filters?.bloqueado !== undefined) {
                query = query.eq('bloqueado', filters.bloqueado)
            }
        }

        if (filters?.provincia) {
            query = query.eq('provincia', filters.provincia)
        }

        if (filters?.search) {
            query = query.or(`nome.ilike.%${filters.search}%,provincia.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
        }

        const { data, error } = await query.order('created_at', { ascending: false })

        console.log('🔍 fetchAllDirecoesProvinciais result:', { data, error, filters })

        if (error) throw error

        return data || []
    } catch (error) {
        console.error('❌ Error fetching direções provinciais:', error)
        throw error
    }
}

/**
 * Activate a direção provincial
 */
export async function activateDirecaoProvincial(direcaoId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('direcoes_provinciais')
            .update({ ativo: true })
            .eq('id', direcaoId)

        if (error) throw error

        // Log the action
        await logSuperAdminAction('ACTIVATE_DIRECAO_PROVINCIAL', null, {
            action: 'Direção Provincial activated',
            direcao_id: direcaoId
        })
    } catch (error) {
        console.error('Error activating direção provincial:', error)
        throw error
    }
}

/**
 * Deactivate a direção provincial
 */
export async function deactivateDirecaoProvincial(direcaoId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('direcoes_provinciais')
            .update({ ativo: false })
            .eq('id', direcaoId)

        if (error) throw error

        // Log the action
        await logSuperAdminAction('DEACTIVATE_DIRECAO_PROVINCIAL', null, {
            action: 'Direção Provincial deactivated',
            direcao_id: direcaoId
        })
    } catch (error) {
        console.error('Error deactivating direção provincial:', error)
        throw error
    }
}

/**
 * Block a direção provincial with reason
 */
export async function blockDirecaoProvincial(direcaoId: string, motivo: string): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser()

        const { error } = await supabase
            .from('direcoes_provinciais')
            .update({
                bloqueado: true,
                bloqueado_motivo: motivo,
                bloqueado_em: new Date().toISOString(),
                bloqueado_por: user?.id
            })
            .eq('id', direcaoId)

        if (error) throw error

        // Log the action
        await logSuperAdminAction('BLOCK_DIRECAO_PROVINCIAL', null, {
            action: 'Direção Provincial blocked',
            direcao_id: direcaoId,
            motivo: motivo
        })
    } catch (error) {
        console.error('Error blocking direção provincial:', error)
        throw error
    }
}

/**
 * Unblock a direção provincial
 */
export async function unblockDirecaoProvincial(direcaoId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('direcoes_provinciais')
            .update({
                bloqueado: false,
                bloqueado_motivo: null,
                bloqueado_em: null,
                bloqueado_por: null
            })
            .eq('id', direcaoId)

        if (error) throw error

        // Log the action
        await logSuperAdminAction('UNBLOCK_DIRECAO_PROVINCIAL', null, {
            action: 'Direção Provincial unblocked',
            direcao_id: direcaoId
        })
    } catch (error) {
        console.error('Error unblocking direção provincial:', error)
        throw error
    }
}
