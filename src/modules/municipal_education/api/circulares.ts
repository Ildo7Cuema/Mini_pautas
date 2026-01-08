/**
 * Circulares API
 * Functions for managing municipal circulars and communications
 */

import { supabase } from '../../../lib/supabaseClient';
import type {
    CircularMunicipal,
    LeituraCircular,
    CreateCircularRequest,
    TipoCircular
} from '../types';

/**
 * Fetch all circulars for the municipality
 */
export async function fetchCirculares(
    municipio: string,
    filters?: {
        tipo?: TipoCircular;
        urgente?: boolean;
        publicado?: boolean;
        limit?: number;
    }
): Promise<CircularMunicipal[]> {
    let query = supabase
        .from('circulares_municipais')
        .select('*')
        .eq('municipio', municipio)
        .order('data_publicacao', { ascending: false });

    if (filters?.tipo) {
        query = query.eq('tipo', filters.tipo);
    }
    if (filters?.urgente !== undefined) {
        query = query.eq('urgente', filters.urgente);
    }
    if (filters?.publicado !== undefined) {
        query = query.eq('publicado', filters.publicado);
    }
    if (filters?.limit) {
        query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Get read counts for each circular
    const circularsWithCounts = await Promise.all(
        (data || []).map(async (circular) => {
            const { count } = await supabase
                .from('leitura_circulares')
                .select('*', { count: 'exact', head: true })
                .eq('circular_id', circular.id);

            return {
                ...circular,
                leituras_count: count || 0
            };
        })
    );

    return circularsWithCounts;
}

/**
 * Fetch a single circular by ID
 */
export async function fetchCircular(circularId: string): Promise<CircularMunicipal | null> {
    const { data, error } = await supabase
        .from('circulares_municipais')
        .select('*')
        .eq('id', circularId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }

    return data;
}

/**
 * Create a new circular
 */
export async function createCircular(
    municipio: string,
    provincia: string,
    request: CreateCircularRequest
): Promise<CircularMunicipal> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilizador não autenticado');

    const { data, error } = await supabase
        .from('circulares_municipais')
        .insert({
            ...request,
            municipio,
            provincia,
            created_by: user.id,
            publicado: true
        })
        .select()
        .single();

    if (error) throw error;

    return data;
}

/**
 * Update a circular
 */
export async function updateCircular(
    circularId: string,
    updates: Partial<CreateCircularRequest>
): Promise<void> {
    const { error } = await supabase
        .from('circulares_municipais')
        .update(updates)
        .eq('id', circularId);

    if (error) throw error;
}

/**
 * Delete a circular (soft delete - set published to false)
 */
export async function deleteCircular(circularId: string): Promise<void> {
    const { error } = await supabase
        .from('circulares_municipais')
        .update({ publicado: false })
        .eq('id', circularId);

    if (error) throw error;
}

/**
 * Fetch readings for a circular
 */
export async function fetchLeituras(circularId: string): Promise<LeituraCircular[]> {
    const { data, error } = await supabase
        .from('leitura_circulares')
        .select(`
            *,
            escola:escolas(id, nome, codigo_escola)
        `)
        .eq('circular_id', circularId)
        .order('lido_em', { ascending: false });

    if (error) throw error;

    return data || [];
}

/**
 * Get schools that haven't read a circular
 */
export async function fetchEscolasPendentes(
    circularId: string,
    municipio: string
): Promise<{ id: string; nome: string; codigo_escola: string }[]> {
    // Get all schools in municipality
    const { data: escolas } = await supabase
        .from('escolas')
        .select('id, nome, codigo_escola')
        .eq('municipio', municipio)
        .eq('ativo', true);

    // Get schools that have read
    const { data: leituras } = await supabase
        .from('leitura_circulares')
        .select('escola_id')
        .eq('circular_id', circularId);

    const escolasQueLerem = new Set(leituras?.map(l => l.escola_id) || []);

    // Filter to schools that haven't read
    return (escolas || []).filter(e => !escolasQueLerem.has(e.id));
}

/**
 * Confirm reading of a circular (called by school users)
 */
export async function confirmarLeitura(
    circularId: string,
    escolaId: string,
    cargo?: string
): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilizador não autenticado');

    // Get user name
    let nome = 'Utilizador';

    // Try to get name from different profiles
    const { data: professor } = await supabase
        .from('professores')
        .select('nome_completo')
        .eq('user_id', user.id)
        .single();

    if (professor) {
        nome = professor.nome_completo;
    } else {
        const { data: secretario } = await supabase
            .from('secretarios')
            .select('nome_completo')
            .eq('user_id', user.id)
            .single();

        if (secretario) {
            nome = secretario.nome_completo;
        } else {
            const { data: escola } = await supabase
                .from('escolas')
                .select('nome')
                .eq('user_id', user.id)
                .single();

            if (escola) {
                nome = escola.nome;
            }
        }
    }

    const { error } = await supabase
        .from('leitura_circulares')
        .insert({
            circular_id: circularId,
            escola_id: escolaId,
            lido_por: user.id,
            lido_por_nome: nome,
            lido_por_cargo: cargo || 'Funcionário'
        });

    if (error) {
        // Ignore duplicate errors (already read)
        if (error.code !== '23505') throw error;
    }
}

/**
 * Check if current school has read a circular
 */
export async function verificarLeitura(
    circularId: string,
    escolaId: string
): Promise<boolean> {
    const { count } = await supabase
        .from('leitura_circulares')
        .select('*', { count: 'exact', head: true })
        .eq('circular_id', circularId)
        .eq('escola_id', escolaId);

    return (count || 0) > 0;
}

/**
 * Get circular statistics
 */
export async function fetchCircularesStats(municipio: string): Promise<{
    total: number;
    circulares: number;
    avisos: number;
    comunicados: number;
    despachos: number;
    urgentes: number;
    este_mes: number;
}> {
    const circulares = await fetchCirculares(municipio, { publicado: true });

    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
        total: circulares.length,
        circulares: circulares.filter(c => c.tipo === 'circular').length,
        avisos: circulares.filter(c => c.tipo === 'aviso').length,
        comunicados: circulares.filter(c => c.tipo === 'comunicado').length,
        despachos: circulares.filter(c => c.tipo === 'despacho').length,
        urgentes: circulares.filter(c => c.urgente).length,
        este_mes: circulares.filter(c => new Date(c.created_at) >= inicioMes).length
    };
}
