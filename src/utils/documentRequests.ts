import { supabase } from '../lib/supabaseClient'
import type {
    CreateSolicitacaoRequest,
    SolicitacaoDocumento,
    TipoDocumento
} from '../types'

/**
 * Create a new document request
 */
export async function createSolicitacao(request: CreateSolicitacaoRequest): Promise<SolicitacaoDocumento> {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

        // Get user role to determine solicitante_tipo
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('tipo_perfil')
            .eq('user_id', user.id)
            .single()

        if (!profile) throw new Error('Profile not found')

        const solicitante_tipo = profile.tipo_perfil === 'PROFESSOR' ? 'PROFESSOR' :
            profile.tipo_perfil === 'SECRETARIO' ? 'SECRETARIO' : 'ESCOLA'

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
                entidade_destino: request.entidade_destino || 'DIRECAO_MUNICIPAL',
                dados_adicionais: request.dados_adicionais || {},
                estado: 'pendente'
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
 * Fetch requests for the current user
 */
export async function fetchMySolicitacoes(): Promise<SolicitacaoDocumento[]> {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

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
        console.error('Error fetching my solicitacoes:', error)
        throw error
    }
}

/**
 * Fetch available document types
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
