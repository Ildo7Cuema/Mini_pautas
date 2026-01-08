/**
 * Escolas Management API
 * Functions for managing schools within the municipality
 */

import { supabase } from '../../../lib/supabaseClient';
import type { Escola } from '../../../types';
import type {
    EstadoEscola,
    HistoricoAdministrativoEscola
} from '../types';

/**
 * Fetch all schools in the municipality with their current state
 */
export async function fetchEscolasMunicipio(municipio: string): Promise<Escola[]> {
    const { data, error } = await supabase
        .from('escolas')
        .select('*')
        .eq('municipio', municipio)
        .order('nome');

    if (error) throw error;
    return data || [];
}

/**
 * Fetch school details with additional stats
 */
export async function fetchEscolaDetalhes(escolaId: string): Promise<{
    escola: Escola;
    total_professores: number;
    total_turmas: number;
    total_alunos: number;
}> {
    // Fetch escola
    const { data: escola, error: escolaError } = await supabase
        .from('escolas')
        .select('*')
        .eq('id', escolaId)
        .single();

    if (escolaError) throw escolaError;

    // Count professores
    const { count: total_professores } = await supabase
        .from('professores')
        .select('*', { count: 'exact', head: true })
        .eq('escola_id', escolaId)
        .eq('ativo', true);

    // Count turmas
    const { data: turmas } = await supabase
        .from('turmas')
        .select('id')
        .eq('escola_id', escolaId);

    const turmaIds = turmas?.map(t => t.id) || [];
    const total_turmas = turmaIds.length;

    // Count alunos
    let total_alunos = 0;
    if (turmaIds.length > 0) {
        const { count } = await supabase
            .from('alunos')
            .select('*', { count: 'exact', head: true })
            .in('turma_id', turmaIds)
            .eq('ativo', true);
        total_alunos = count || 0;
    }

    return {
        escola,
        total_professores: total_professores || 0,
        total_turmas,
        total_alunos
    };
}

/**
 * Get the current estado of a school
 */
export function getEstadoEscola(escola: Escola): EstadoEscola {
    if (escola.bloqueado) return 'bloqueada';
    if (!escola.ativo) return 'inactiva';
    // Check for suspensa state (stored in configuracoes or a field)
    const suspensa = escola.configuracoes?.suspenso === true;
    if (suspensa) return 'suspensa';
    return 'activa';
}

/**
 * Update school state with history tracking
 */
export async function updateEstadoEscola(
    escolaId: string,
    novoEstado: EstadoEscola,
    motivo: string,
    observacoes?: string
): Promise<void> {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilizador não autenticado');

    // Get current school data
    const { data: escola, error: escolaError } = await supabase
        .from('escolas')
        .select('*')
        .eq('id', escolaId)
        .single();

    if (escolaError) throw escolaError;

    const estadoAnterior = getEstadoEscola(escola);

    // Prepare updates based on new state
    const updates: Partial<Escola> = {};

    switch (novoEstado) {
        case 'activa':
            updates.ativo = true;
            updates.bloqueado = false;
            updates.bloqueado_motivo = undefined;
            updates.configuracoes = { ...escola.configuracoes, suspenso: false };
            break;
        case 'suspensa':
            updates.ativo = true;
            updates.bloqueado = false;
            updates.configuracoes = {
                ...escola.configuracoes,
                suspenso: true,
                suspenso_motivo: motivo,
                suspenso_em: new Date().toISOString()
            };
            break;
        case 'bloqueada':
            updates.bloqueado = true;
            updates.bloqueado_motivo = motivo;
            updates.bloqueado_em = new Date().toISOString();
            updates.bloqueado_por = user.id;
            break;
        case 'inactiva':
            updates.ativo = false;
            updates.bloqueado = false;
            break;
    }

    // Update escola
    const { error: updateError } = await supabase
        .from('escolas')
        .update(updates)
        .eq('id', escolaId);

    if (updateError) throw updateError;

    // Create history entry
    const { error: historyError } = await supabase
        .from('historico_administrativo_escolas')
        .insert({
            escola_id: escolaId,
            estado_anterior: estadoAnterior,
            estado_novo: novoEstado,
            motivo,
            observacoes,
            alterado_por: user.id,
            alterado_por_tipo: 'DIRECAO_MUNICIPAL'
        });

    if (historyError) throw historyError;
}

/**
 * Fetch administrative history for a school
 */
export async function fetchHistoricoAdministrativo(
    escolaId: string
): Promise<HistoricoAdministrativoEscola[]> {
    const { data, error } = await supabase
        .from('historico_administrativo_escolas')
        .select(`
            *,
            escola:escolas(id, nome, codigo_escola)
        `)
        .eq('escola_id', escolaId)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
}

/**
 * Fetch all history for the municipality
 */
export async function fetchHistoricoMunicipio(
    municipio: string,
    limit: number = 50
): Promise<HistoricoAdministrativoEscola[]> {
    // First get escola IDs in the municipality
    const { data: escolas } = await supabase
        .from('escolas')
        .select('id')
        .eq('municipio', municipio);

    const escolaIds = escolas?.map(e => e.id) || [];

    if (escolaIds.length === 0) return [];

    const { data, error } = await supabase
        .from('historico_administrativo_escolas')
        .select(`
            *,
            escola:escolas(id, nome, codigo_escola)
        `)
        .in('escola_id', escolaIds)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;

    return data || [];
}

/**
 * Get school state statistics for the municipality
 */
export async function fetchEstatisticasEstados(municipio: string): Promise<{
    activas: number;
    suspensas: number;
    bloqueadas: number;
    inactivas: number;
    total: number;
}> {
    const escolas = await fetchEscolasMunicipio(municipio);

    const stats = {
        activas: 0,
        suspensas: 0,
        bloqueadas: 0,
        inactivas: 0,
        total: escolas.length
    };

    for (const escola of escolas) {
        const estado = getEstadoEscola(escola);
        stats[estado === 'activa' ? 'activas' :
            estado === 'suspensa' ? 'suspensas' :
                estado === 'bloqueada' ? 'bloqueadas' : 'inactivas']++;
    }

    return stats;
}
