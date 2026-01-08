import { supabase } from '../lib/supabaseClient'
import type {
    SolicitacaoDocumento,
    TipoDocumento,
    CreateSolicitacaoRequest
} from '../types'

/**
 * Solicitações Utility Functions
 * For professors and staff to create and track document requests
 */

/**
 * Fetch all active document types
 */
export async function fetchTiposDocumento(): Promise<TipoDocumento[]> {
    try {
        const { data, error } = await supabase
            .from('tipos_documento')
            .select('*')
            .eq('ativo', true)
            .order('nome')

        if (error) throw error

        return data || []
    } catch (error) {
        console.error('Error fetching tipos documento:', error)
        throw error
    }
}

/**
 * Create a new document request
 */
export async function criarSolicitacao(request: CreateSolicitacaoRequest): Promise<SolicitacaoDocumento> {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Usuário não autenticado')

        // Determine solicitante_tipo from user profile
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('tipo_perfil')
            .eq('user_id', user.id)
            .single()

        if (!profile) throw new Error('Perfil não encontrado')

        let solicitante_tipo: 'PROFESSOR' | 'SECRETARIO' | 'ESCOLA'
        switch (profile.tipo_perfil) {
            case 'PROFESSOR':
                solicitante_tipo = 'PROFESSOR'
                break
            case 'SECRETARIO':
                solicitante_tipo = 'SECRETARIO'
                break
            case 'ESCOLA':
                solicitante_tipo = 'ESCOLA'
                break
            default:
                throw new Error('Tipo de perfil não pode criar solicitações')
        }

        const { data, error } = await supabase
            .from('solicitacoes_documentos')
            .insert({
                solicitante_user_id: user.id,
                solicitante_tipo,
                escola_id: request.escola_id,
                tipo_documento_id: request.tipo_documento_id,
                assunto: request.assunto,
                descricao: request.descricao,
                urgente: request.urgente || false,
                dados_adicionais: request.dados_adicionais || {}
            })
            .select()
            .single()

        if (error) throw error

        return data
    } catch (error) {
        console.error('Error creating solicitacao:', error)
        throw error
    }
}

/**
 * Fetch current user's solicitações
 */
export async function fetchMinhasSolicitacoes(): Promise<SolicitacaoDocumento[]> {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Usuário não autenticado')

        const { data, error } = await supabase
            .from('solicitacoes_documentos')
            .select(`
                *,
                tipo_documento:tipos_documento(*),
                escola:escolas(id, nome)
            `)
            .eq('solicitante_user_id', user.id)
            .order('created_at', { ascending: false })

        if (error) throw error

        return data || []
    } catch (error) {
        console.error('Error fetching minhas solicitacoes:', error)
        throw error
    }
}

/**
 * Update a pending solicitação (add more info)
 */
export async function atualizarSolicitacao(
    solicitacaoId: string,
    updates: {
        descricao?: string
        dados_adicionais?: Record<string, any>
    }
): Promise<void> {
    try {
        const { error } = await supabase
            .from('solicitacoes_documentos')
            .update(updates)
            .eq('id', solicitacaoId)

        if (error) throw error
    } catch (error) {
        console.error('Error updating solicitacao:', error)
        throw error
    }
}

/**
 * Get status label and color for a solicitação estado
 */
export function getEstadoLabel(estado: string): { label: string; color: string; bgColor: string } {
    switch (estado) {
        case 'pendente':
            return { label: 'Pendente', color: 'text-yellow-700', bgColor: 'bg-yellow-100' }
        case 'em_analise':
            return { label: 'Em Análise', color: 'text-blue-700', bgColor: 'bg-blue-100' }
        case 'pendente_info':
            return { label: 'Aguardando Info', color: 'text-orange-700', bgColor: 'bg-orange-100' }
        case 'aprovado':
            return { label: 'Aprovado', color: 'text-green-700', bgColor: 'bg-green-100' }
        case 'rejeitado':
            return { label: 'Rejeitado', color: 'text-red-700', bgColor: 'bg-red-100' }
        case 'concluido':
            return { label: 'Concluído', color: 'text-purple-700', bgColor: 'bg-purple-100' }
        default:
            return { label: estado, color: 'text-gray-700', bgColor: 'bg-gray-100' }
    }
}

/**
 * Format date for display
 */
export function formatDataSolicitacao(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-AO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    })
}
