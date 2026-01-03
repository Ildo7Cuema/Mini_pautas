import { supabase } from '../lib/supabaseClient'
import type { SuperAdminStats, SuperAdminAction, Escola, EscolaBackup } from '../types'

/**
 * SUPERADMIN Utility Functions
 * Provides API functions for SUPERADMIN operations
 */

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
 * Block a school with reason
 */
export async function blockEscola(escolaId: string, motivo: string): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser()

        const { error } = await supabase
            .from('escolas')
            .update({
                bloqueado: true,
                bloqueado_motivo: motivo,
                bloqueado_em: new Date().toISOString(),
                bloqueado_por: user?.id
            })
            .eq('id', escolaId)

        if (error) throw error

        // Log the action
        await logSuperAdminAction('BLOCK_ESCOLA', escolaId, {
            action: 'Escola blocked',
            escola_id: escolaId,
            motivo: motivo
        })
    } catch (error) {
        console.error('Error blocking escola:', error)
        throw error
    }
}

/**
 * Unblock a school
 */
export async function unblockEscola(escolaId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('escolas')
            .update({
                bloqueado: false,
                bloqueado_motivo: null,
                bloqueado_em: null,
                bloqueado_por: null
            })
            .eq('id', escolaId)

        if (error) throw error

        // Log the action
        await logSuperAdminAction('UNBLOCK_ESCOLA', escolaId, {
            action: 'Escola unblocked',
            escola_id: escolaId
        })
    } catch (error) {
        console.error('Error unblocking escola:', error)
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
